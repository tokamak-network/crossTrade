module.exports = {

              solidity: '0.8.24',
              settings: {
                "viaIR": true,
                optimizer: {
                  enabled: true,
                  runs: 100000000,
                  details: {
                  yul: true,
                  },
                }
              }
            }
            