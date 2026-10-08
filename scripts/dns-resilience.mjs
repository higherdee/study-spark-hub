/**
 * Syllaboss Resilient DNS Resolver
 * Intercepts EAI_AGAIN and ESERVFAIL DNS timeouts and resolves via Google (8.8.8.8) and Cloudflare (1.1.1.1) DNS.
 */
import dns from "node:dns";

const resolver = new dns.promises.Resolver();
resolver.setServers(["8.8.8.8", "1.1.1.1", "8.8.4.4"]);

const origLookup = dns.lookup;

dns.lookup = function (hostname, options, callback) {
  if (typeof options === "function") {
    callback = options;
    options = {};
  }

  origLookup(hostname, options, async (err, address, family) => {
    if (err) {
      try {
        const addresses = await resolver.resolve4(hostname);
        if (addresses && addresses.length > 0) {
          if (options && options.all) {
            return callback(null, addresses.map(a => ({ address: a, family: 4 })));
          }
          return callback(null, addresses[0], 4);
        }
      } catch (resErr) {
        try {
          const cnames = await resolver.resolveCname(hostname);
          if (cnames && cnames.length > 0) {
            const cnameAddrs = await resolver.resolve4(cnames[0]);
            if (cnameAddrs && cnameAddrs.length > 0) {
              if (options && options.all) {
                return callback(null, cnameAddrs.map(a => ({ address: a, family: 4 })));
              }
              return callback(null, cnameAddrs[0], 4);
            }
          }
        } catch (cnameErr) {}
      }
    }
    return callback(err, address, family);
  });
};
