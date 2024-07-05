// Import the base adapter
import { spec as baseAdapter } from './appnexusBidAdapter.js'; // eslint-disable-line prebid/validate-imports
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { logInfo } from '../src/utils.js';

const BIDDER_CODE = 'raveltech';
const URL = 'https://pb1.rvlproxy.net/bid/bid';
// const URL_SIMPLE = 'https://pb1.rvlproxy.net/bid/simplebid';

export const spec = {
  code: BIDDER_CODE,
  gvlid: baseAdapter.GVLID, // use base adapter gvlid

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {BidRequest[]} bidRequests A non-empty list of bid requests which should be sent to the Server.
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function(bidRequests, bidderRequest) {
    if (!baseAdapter.buildRequests) { return []; }

    const ZKAD = window.ZKAD || { anonymizeID(v, p) { return []; } };
    // const SOURCE = baseAdapter.SOURCE;

    // Log if ZKAD runtime is ready to be used
    logInfo('ZKAD.ready=', ZKAD.ready);

    // Prepare the list of modified bid requests
    let anonymizedBidRequest = baseAdapter.buildRequests(bidRequests, bidderRequest);
    logInfo('Processing bid request:', anonymizedBidRequest);

    // redirects the anonymized bid request to the server able to decode the encoded eids
    anonymizedBidRequest.url = URL;

    let payload = JSON.parse(anonymizedBidRequest.data);

    if (anonymizedBidRequest.bidderRequest.bids[0].userId) {
      let eids = [];

      anonymizedBidRequest.bidderRequest.bids[0].userIdAsEids.forEach(eid => {
        if (!eid || !eid.uids || eid.uids.length < 1) { return; }
        eid.uids.forEach(uid => {
          // ZKAD multiple RID Support

          let tmp = {'source': eid.source, 'id': uid.id};

          logInfo('eid.source=', eid.source)
          let ravelId = ZKAD.anonymizeID(uid.id, eid.source);
          logInfo('Anonymized uid.id=', uid.id, 'as byte array of length=', ravelId.length)
          tmp.id = ravelId;
          eids.push(tmp);
        });
      });
      if (eids.length) {
        payload.eids = eids;
      }

      // Attach the modified payload back to the bid request
      anonymizedBidRequest.data = payload;
    }

    return [anonymizedBidRequest];
  },

  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {object} bid The bid to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function (bid) {
    if (!baseAdapter.isBidRequestValid) { return true; }
    return baseAdapter.isBidRequestValid(bid);
  },

  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {*} serverResponse A successful response from the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function (serverResponse, params) {
    if (!baseAdapter.interpretResponse) { return []; }
    return baseAdapter.interpretResponse(serverResponse, params);
  },

  getUserSyncs: function (syncOptions, responses, gdprConsent) {
    if (!baseAdapter.getUserSyncs) { return []; }
    return baseAdapter.getUserSyncs(syncOptions, responses, gdprConsent);
  },

  /**
   * Add element selector to javascript tracker to improve native viewability
   * @param {Bid} bid
   */
  onBidWon: function (bid) {
    if (!baseAdapter.onBidWon) { return; }
    baseAdapter.onBidWon(bid);
  }
};

registerBidder(spec);
