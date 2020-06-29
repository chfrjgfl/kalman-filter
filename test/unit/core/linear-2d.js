const test = require('ava');

// Tests in 2D with constant speed model

const CoreKalmanFilter = require('../../../lib/core-kalman-filter.js');
const State = require('../../../lib/state.js');
const trace = require('../../../lib/linalgebra/trace.js');
const distanceMat = require('../../../lib/linalgebra/distance-mat.js');

const defaultOptions = {
	observation: {
		dimension: 2,
		stateProjection() {
			
			return [
				[1, 0, 0, 0],
				[0, 1, 0, 0]
			];
		},

		covariance() {
			return [
				[1, 0],
				[0, 1]
			];
		}
	},

	dynamic: {
		init: {
			mean: [[500], [500], [0], [0]],

			covariance: [
				[huge, 0, 0, 0],
				[0, huge, 0, 0],
				[0, 0, huge, 0],
				[0, 0, 0, huge]
			]
		},

		dimension: 4,
		transition() {
			return [
				[1, 0, timeStep, 0],
				[0, 1, 0, timeStep],
				[0, 0, 1, 0],
				[0, 0, 0, 1]
			];
		},

		covariance() {
			return [
				[1, 0, 0, 0],
				[0, 1, 0, 0],
				[0, 0, 0.1, 0],
				[0, 0, 0, 0.1]
			];
		}
	}

};

const huge = 1000;
const tiny = 0.001;
const timeStep = 0.1;

const observations = [
	[1, 2],
	[2.1, 3.9],
	[3, 6]
];

// Test 1: Verify that if observation fits the model, then the newCorrected.covariance
// is smaller than if not

test('Fitted observation', t => {
	const kf1 = new CoreKalmanFilter(defaultOptions);
	const firstState = new State({
		mean: [[1], [2], [11], [19]],
		covariance: [
			[1, 0, 0, 0],
			[0, 1, 0, 0],
			[0, 0, 1, 0],
			[0, 0, 0, 1]
		]
	});
	const badFittedObs = [[3.2, 2.9]];
	const predicted1 = kf1.predict({
		previousCorrected: firstState
	});
	const corrected1 = kf1.correct({
		predicted: predicted1,
		observation: observations[1]
	});
	const corrected2 = kf1.correct({
		predicted: predicted1,
		observation: badFittedObs
	});
	t.true(corrected1 instanceof State);
	t.true(corrected2 instanceof State);
	t.true(trace(corrected1.covariance) < trace(corrected2.covariance));
	const dist1 = distanceMat(firstState.mean, corrected1.mean);
	const dist2 = distanceMat(firstState.mean, corrected2.mean);

	// We verify that the new mean has changed more when observation does not fit the model
	t.true(dist1 < dist2);
});

// Test 2: Covariance position/speed in one direction

test('Covariance between position and speed', t => {
	const kf = new CoreKalmanFilter(defaultOptions);
	const {covariance} = kf.predict();
	t.not(covariance[1][3], 0); // Check if the covariance between x and Vx is not zero
	t.not(covariance[2][4], 0);
});

// Test 3: Balanced vs unbalanced: verify that the covariance is smaller when balanced

test('Balanced and unbalanced', t => {
	const kf = new CoreKalmanFilter(defaultOptions);
	const previousCorrectedBalanced = new State({
		mean: [[1], [2], [1.1], [1.9]],
		covariance: [
			[2, 0, 0, 0],
			[0, 2, 0, 0],
			[0, 0, 0.2, 0],
			[0, 0, 0, 0.2]
		]
	});
	const previousCorrectedUnbalanced = new State({
		mean: [[1], [2], [1.1], [1.9]],
		covariance: [
			[10, 0, 0, 0],
			[0, 0.1, 0, 0],
			[0, 0, 1, 0],
			[0, 0, 0, 0.01]
		]
	});
	const predictedBalanced = kf.predict({
		previousCorrected: previousCorrectedBalanced
	});
	const predictedUnbalanced = kf.predict({
		previousCorrected: previousCorrectedUnbalanced
	});
	t.true(predictedBalanced instanceof State);
	t.true(predictedUnbalanced instanceof State);
	t.true(trace(predictedBalanced.covariance) < trace(predictedUnbalanced.covariance));
});

// Test 4: Impact of timeStep

test('Impact of timeStep', t => {
	const timeStep1 = 1;
	const timeStep2 = 2;
	const smallTimeStepOpts = Object.assign({}, defaultOptions, {
		dynamic: Object.assign({}, defaultOptions.dynamic, {
			transition() {
				return [
					[1, 0, timeStep1, 0],
					[0, 1, 0, timeStep1],
					[0, 0, 1, 0],
					[0, 0, 0, 1]
				];
			}
		})
	});
	const bigTimeStepOpts = Object.assign({}, defaultOptions, {
		dynamic: Object.assign({}, defaultOptions.dynamic, {
			transition() {
				return [
					[1, 0, timeStep2, 0],
					[0, 1, 0, timeStep2],
					[0, 0, 1, 0],
					[0, 0, 0, 1]
				];
			}
		})
	});
	const kf1 = new CoreKalmanFilter({smallTimeStepOpts});
	const kf2 = new CoreKalmanFilter({bigTimeStepOpts});
	const predicted1 = kf1.predict();
	const predicted2 = kf2.predict();
	t.true(predicted1 instanceof State);
	t.true(predicted2 instanceof State);
	t.true(trace(predicted1.covariance) < trace(predicted2.covariance));
});
