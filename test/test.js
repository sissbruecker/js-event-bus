var assert = buster.assert;

buster.testCase("Responder", function(run){

    require.config({baseUrl:"/../event-bus.js"});

    require(["event-bus"],function(module) {

        run({
            "missing result handler" : function(done) {

                assert.exception(function() {

                    new module.Responder();
                });

                done();
            }
        });
    });
});