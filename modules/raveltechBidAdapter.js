// Import the base adapter
import { spec as baseAdapter } from './appnexusBidAdapter.js'; // eslint-disable-line prebid/validate-imports
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { logInfo } from '../src/utils.js';
import { config } from '../src/config.js';

const BIDDER_CODE = 'raveltech';
const URL = 'https://pb1.rvlproxy.net/bid/bid';
const URL_SIMPLE = 'https://pb1.rvlproxy.net/bid/simplebid';

export const spec = {
  ...baseAdapter,

  code: BIDDER_CODE,

  buildRequests: function(bidRequests, bidderRequest) {
    // call the appnexus adapter first to preserve all initial functions
    const requests = baseAdapter.buildRequests.call(this, bidRequests, bidderRequest);

    requests.forEach(request => {
      // Override the request URL
      request.url = URL;

      let payload = request.data;

      // OMID Support <-- really necessary?
      let omidSupport = config.getConfig('omidSupport');
      if (omidSupport) {
        payload['iab_support'] = {
          omidpn: 'RavelTech',
          omidpv: '$prebid.version$'
        };
      }

      const ZKAD = window.ZKAD || { anonymizeID(v, p) { return []; } };

      // indicates if the runtime is ready to be used
      // aka ZKAD.anonymizeID() is ready to use
      // note if ZKAD is not available, variable will be undefined
      logInfo('ZKAD.ready=', ZKAD.ready)

      // EIDs
      if (bidRequests[0].userId) {
        let eids = [];
        bidRequests[0].userIdAsEids.forEach(eid => {
          if (!eid || !eid.uids || eid.uids.length < 1) return;
          eid.uids.forEach(uid => {
            let tmp = { 'source': eid.source, 'id': uid.id };
            if (eid.source === 'adserver.org') {
              tmp.rti_partner = 'TDID';
            } else if (eid.source === 'uidapi.com') {
              tmp.rti_partner = 'UID2';
            }

            // ZKAD anonymization
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
      }

    });

    return requests;
  }
};

registerBidder(spec);
