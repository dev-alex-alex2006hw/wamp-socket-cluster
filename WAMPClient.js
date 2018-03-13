const get = require('./utils').get;
const schemas = require('./schemas');

class WAMPClient {
	/**
	 * @returns {number}
	 */
	static get MAX_CALLS_ALLOWED() {
		return 100;
	}

	/**
	 * @returns {number}
	 */
	static get MAX_GENERATE_ATTEMPTS() {
		return 10e3;
	}

	/**
	 * @param {number} requestsTimeoutMs - time [ms] to wait for RPC responses sent to WAMPServer
	 */
	constructor(requestsTimeoutMs = 10e3) {
		this.callsResolvers = {};
		this.pendingCalls = {}; // TODO 2
		this.requestsTimeoutMs = requestsTimeoutMs;
	}

	/**
	 * @param {Object} socket - SocketCluster.Socket
	 * @returns {Object} wampSocket
	 */
	upgradeToWAMP(socket) {
		if (socket.call) {
			// Already upgraded.
			return socket;
		}
		const wampSocket = socket;

		/**
		 * Call procedure registered in WAMPServer
		 * @param {string} procedure
		 * @param {*} data
		 * @returns {Promise}
		 */
		wampSocket.call = (procedure, data) => new Promise((success, fail) => {
			if (!this.pendingCalls[procedure]) {
				this.pendingCalls[procedure] = {
					count: 0
				};
			}
			this.pendingCalls[procedure].count++;
			if (this.pendingCalls[procedure].count >= WAMPClient.MAX_CALLS_ALLOWED) {
				return fail(`No more than ${WAMPClient.MAX_CALLS_ALLOWED} calls allowed`);
			}

			return wampSocket.emit('rpc-request', {
				data,
				procedure,
				type: schemas.RPCRequestSchema.id,
			}, (err, result) => {
				this.pendingCalls[procedure].count--;
				if (this.pendingCalls[procedure].count <= 0) {
					delete this.pendingCalls[procedure];
				}
				if (err) {
					fail(err);
				} else {
					success(result);
				}
			});
		});

		return wampSocket;
	}
}

module.exports = WAMPClient;
