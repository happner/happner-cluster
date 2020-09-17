const expect = require('expect.js');
describe('03-filter-event-versions', function() {
  it('tests filter-event-versions', function() {
    const eventVersionsFilter = require('../../lib/filter-event-versions');
    expect(
      eventVersionsFilter(
        {
          request: {
            options: {
              meta: {
                componentVersion: '1.0.0-prerelease-1'
              }
            }
          }
        },
        [
          {
            data: {
              options: {
                meta: {
                  componentVersion: '^1.0.0'
                }
              },
              path: '/_events/test/1'
            }
          },
          {
            data: {
              options: {
                meta: {
                  componentVersion: '^2.0.0'
                }
              },
              path: '/_events/test/1'
            }
          }
        ]
      )
    ).to.eql([
      {
        __keep: true,
        data: {
          options: {
            meta: {
              componentVersion: '^1.0.0'
            }
          },
          path: '/_events/test/1'
        }
      }
    ]);

    expect(
      eventVersionsFilter(
        {
          request: {
            options: {
              meta: {
                componentVersion: '1.0.1'
              }
            }
          }
        },
        [
          {
            data: {
              options: {
                meta: {
                  componentVersion: '^1.0.0'
                }
              },
              path: '/_events/test/1'
            }
          },
          {
            data: {
              options: {
                meta: {
                  componentVersion: '^2.0.0'
                }
              },
              path: '/_events/test/1'
            }
          }
        ]
      )
    ).to.eql([
      {
        __keep: true,
        data: {
          options: {
            meta: {
              componentVersion: '^1.0.0'
            }
          },
          path: '/_events/test/1'
        }
      }
    ]);
  });
});
