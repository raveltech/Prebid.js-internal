// Import the base adapter
import { appnexusBidAdapter } from 'modules/appnexusBidAdapter.js';
import { registerBidder } from 'src/adapters/bidderFactory.js';
import { logError, logInfo, logMessage, deepClone } from 'src/utils.js';
import { config } from 'src/config.js';

const BIDDER_CODE = 'raveltech';
const URL = 'https://pb1.rvlproxy.net/bid/bid';
const URL_SIMPLE = 'https://pb1.rvlproxy.net/bid/simplebid';

export const raveltechBidAdapter = {
  ...appnexusBidAdapter,

  code: BIDDER_CODE,

  buildRequests: function(bidRequests, bidderRequest) {
    // call the appnexus adapter first to preserve all initial functions
    const requests = appnexusBidAdapter.buildRequests.call(this, bidRequests, bidderRequest);

    requests.forEach(request => {
      // Override the request URL
      request.url = URL;

      let payload = request.data;

      // OMID Support <-- really necessary?
      let omidSupport = config.getConfig('omidSupport');
      if (omidSupport) {
        payload['iab_support'] = {
          omidpn: 'Raveltech',
          omidpv: '$prebid.version$'
        };
      }

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
  },

  interpretResponse: function(serverResponse, request) {
    const bidResponses = [];
    const response = serverResponse.body;

    response.seatbid.forEach(seatBid => {
      seatBid.bid.forEach(serverBid => {
        const bid = {
          adId: serverBid.id,
          requestId: serverBid.uuid,
          cpm: serverBid.price,
          creativeId: serverBid.crid,
          dealId: serverBid.dealid,
          currency: 'USD',
          netRevenue: true,
          ttl: 300,
          adUnitCode: request.adUnitCode,
          raveltech: {
            buyerMemberId: serverBid.ext && serverBid.ext.buyer_member_id,
            dealPriority: serverBid.ext && serverBid.ext.deal_priority,
            dealCode: serverBid.ext && serverBid.ext.deal_code,
          }
        };
        bidResponses.push(bid);
      });
    });

    return bidResponses;
  }
};

registerBidder(raveltechBidAdapter);
