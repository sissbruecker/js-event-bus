var assert = buster.assert;

buster.testRunner.timeout = 1000;

buster.testCase("Responder", function (run) {

    run({
        "Responder:test-missing-result-handler": function (done) {

            assert.exception(function () {

                new lazydevs.eventbus.Responder();
            });

            done();
        },

        "Responder:test-result-with-data": function (done) {

            var responder = new lazydevs.eventbus.Responder(

                function (data) {

                    assert.equals(data, "test-complete");

                    done();
                }
            );

            responder.result("test-complete");
        },

        "Responder:test-result-without-data": function (done) {

            var responder = new lazydevs.eventbus.Responder(

                function (data) {

                    assert.equals(data, undefined);

                    done();
                }
            );

            responder.result();
        },

        "Responder:test-fault": function (done) {

            var responder = new lazydevs.eventbus.Responder(

                function (data) {
                },
                function (error) {
                    assert.equals(error.message, "test-fault");
                    done();
                }
            );

            responder.fault(new Error("test-fault"));
        }

    });
});

buster.testCase("AsyncOperation", function (run) {

    run({
        "AsyncOperation:test-result": function (done) {

            var operation = new lazydevs.eventbus.AsyncOperation();
            var responderResults = [];

            operation.addResponder(new lazydevs.eventbus.Responder(function (data) {
                responderResults.push(data)
            }));
            operation.addResponder(new lazydevs.eventbus.Responder(function (data) {
                responderResults.push(data)
            }));
            operation.addResponder(new lazydevs.eventbus.Responder(function (data) {
                responderResults.push(data)
            }));

            operation.result("test-result");

            assert.equals(responderResults.length, 3);
            assert.equals(responderResults[0], "test-result");
            assert.equals(responderResults[1], "test-result");
            assert.equals(responderResults[2], "test-result");

            done();
        },
        "AsyncOperation:test-fault": function (done) {

            var operation = new lazydevs.eventbus.AsyncOperation();
            var responderFaults = [];

            operation.addResponder(new lazydevs.eventbus.Responder(function (data) {
            }, function (fault) {
                responderFaults.push(fault)
            }));
            operation.addResponder(new lazydevs.eventbus.Responder(function (data) {
            }, function (fault) {
                responderFaults.push(fault)
            }));
            operation.addResponder(new lazydevs.eventbus.Responder(function (data) {
            }, function (fault) {
                responderFaults.push(fault)
            }));

            operation.fault(new Error("test-fault"));

            assert.equals(responderFaults.length, 3);
            assert.equals(responderFaults[0].message, "test-fault");
            assert.equals(responderFaults[1].message, "test-fault");
            assert.equals(responderFaults[2].message, "test-fault");

            done();
        }
    });
});

buster.testCase("EventChainStep", function (run) {

    run({
        "EventChainStep:test-proceed-sync": function (done) {

            var isStepComplete = false;

            var EventBusMockup = function () {

                var self = this;

                self.events = [];

                self.publish = function (event) {

                    self.events.push(event);
                }
            };

            var bus = new EventBusMockup();

            var EventChainMockup = function () {

                var self = this;

                self.eventBus = bus;

                self.stepComplete = function () {
                    isStepComplete = true;
                };
            };

            var step = new lazydevs.eventbus.EventChainStep(new EventChainMockup(), {"type": "test-proceed-sync-event-type", data: "test-proceed-sync-event-data"});

            step.proceed();

            assert.equals(bus.events.length, 1);
            assert.equals(bus.events[0].type, "test-proceed-sync-event-type");
            assert.equals(bus.events[0].data, "test-proceed-sync-event-data");
            assert.equals(step.pending, 0);
            assert.equals(step.isComplete, true);
            assert.equals(step.isFailed, false);
            assert.equals(isStepComplete, true);

            done();
        },
        "EventChainStep:test-proceed-async": function (done) {

            var isStepComplete = false;

            var EventBusMockup = function () {

                var self = this;

                self.events = [];

                self.publish = function (event) {

                    var operation1 = new lazydevs.eventbus.AsyncOperation();
                    var operation2 = new lazydevs.eventbus.AsyncOperation();
                    var operation3 = new lazydevs.eventbus.AsyncOperation();

                    event.step.addAsyncOperation(operation1);
                    event.step.addAsyncOperation(operation2);
                    event.step.addAsyncOperation(operation3);

                    setTimeout(function () {
                        operation1.result("result");
                    }, 100);

                    setTimeout(function () {
                        operation2.result("result");
                    }, 100);

                    setTimeout(function () {
                        operation3.result("result");
                    }, 100);

                    self.events.push(event);
                }
            };

            var bus = new EventBusMockup();

            var EventChainMockup = function () {

                var self = this;

                self.eventBus = bus;

                self.stepComplete = function () {
                    isStepComplete = true;
                };
            };

            var step = new lazydevs.eventbus.EventChainStep(new EventChainMockup(), {"type": "test-proceed-async-event-type", data: "test-proceed-async-event-data"});

            step.proceed();

            assert.equals(step.pending, 3);
            assert.equals(step.isComplete, false);
            assert.equals(step.isFailed, false);
            assert.equals(isStepComplete, false);

            setTimeout(function () {
                assert.equals(step.pending, 0);
                assert.equals(step.isComplete, true);
                assert.equals(step.isFailed, false);
                assert.equals(isStepComplete, true);
                done();
            }, 200);
        },
        "EventChainStep:test-proceed-async-error": function (done) {


            var EventBusMockup = function () {

                var self = this;

                self.publish = function (event) {

                    var operation1 = new lazydevs.eventbus.AsyncOperation();
                    var operation2 = new lazydevs.eventbus.AsyncOperation();
                    var operation3 = new lazydevs.eventbus.AsyncOperation();

                    event.step.addAsyncOperation(operation1);
                    event.step.addAsyncOperation(operation2);
                    event.step.addAsyncOperation(operation3);

                    setTimeout(function () {
                        operation1.fault(new Error("test-proceed-async-error"));
                    }, 100);

                    setTimeout(function () {
                        operation1.fault(new Error("test-proceed-async-error"));
                    }, 100);

                    setTimeout(function () {
                        operation1.fault(new Error("test-proceed-async-error"));
                    }, 100);
                }
            };

            var bus = new EventBusMockup();

            var errors = 0;

            var EventChainMockup = function () {

                var self = this;

                self.eventBus = bus;

                self.stepError = function () {
                    errors++;
                };
            };

            var step = new lazydevs.eventbus.EventChainStep(new EventChainMockup(), {"type": "test-proceed-async-event-type", data: "test-proceed-async-event-data"});

            step.proceed();

            assert.equals(step.pending, 3);
            assert.equals(step.isComplete, false);
            assert.equals(step.isFailed, false);

            setTimeout(function () {
                assert.equals(errors, 3);
                assert.equals(step.pending, 0);
                assert.equals(step.isComplete, true);
                assert.equals(step.isFailed, true);
                done();
            }, 200);
        }
    });
});

buster.testCase("EventChain", function (run) {

    run({
        "EventChain:test-sync": function (done) {

            var EventBusMockup = function () {

                var self = this;

                self.events = [];

                self.publish = function (event) {

                    self.events.push(event);
                }
            };

            var bus = new EventBusMockup();

            var chain = new lazydevs.eventbus.EventChain(bus);

            chain.add({type: "test-sync-event-type-1", data: "test-sync-event-data"})
                .add({type: "test-sync-event-type-2", data: "test-sync-event-data"})
                .add({type: "test-sync-event-type-3", data: "test-sync-event-data"})
                .start();

            assert.equals(bus.events.length, 3);
            assert.equals(bus.events[0].type, "test-sync-event-type-1");
            assert.equals(bus.events[1].type, "test-sync-event-type-2");
            assert.equals(bus.events[2].type, "test-sync-event-type-3");
            assert.equals(chain.isComplete, true);
            assert.equals(chain.isFailed, false);

            done();
        },
        "EventChain:test-async": function (done) {

            var EventBusMockup = function () {

                var self = this;

                self.events = [];

                self.publish = function (event) {

                    var operation1 = new lazydevs.eventbus.AsyncOperation();
                    var operation2 = new lazydevs.eventbus.AsyncOperation();
                    var operation3 = new lazydevs.eventbus.AsyncOperation();

                    event.step.addAsyncOperation(operation1);
                    event.step.addAsyncOperation(operation2);
                    event.step.addAsyncOperation(operation3);

                    setTimeout(function () {
                        operation1.result("result");
                    }, 100);

                    setTimeout(function () {
                        operation2.result("result");
                    }, 100);

                    setTimeout(function () {
                        operation3.result("result");
                    }, 100);

                    self.events.push(event);
                }
            };

            var bus = new EventBusMockup();

            var chain = new lazydevs.eventbus.EventChain(bus);

            chain.add({type: "test-async-event-type-1", data: "test-async-event-data"})
                .add({type: "test-async-event-type-2", data: "test-async-event-data"})
                .add({type: "test-async-event-type-3", data: "test-async-event-data"})
                .start();

            assert.equals(chain.isComplete, false);
            assert.equals(chain.isFailed, false);

            setTimeout(function () {

                assert.equals(bus.events.length, 3);
                assert.equals(bus.events[0].type, "test-async-event-type-1");
                assert.equals(bus.events[1].type, "test-async-event-type-2");
                assert.equals(bus.events[2].type, "test-async-event-type-3");
                assert.equals(chain.isComplete, true);
                assert.equals(chain.isFailed, false);

                done();

            }, 500);
        },
        "EventChain:test-async-continue-on-error": function (done) {

            var EventBusMockup = function () {

                var self = this;

                self.events = [];

                self.publish = function (event) {

                    var operation1 = new lazydevs.eventbus.AsyncOperation();

                    event.step.addAsyncOperation(operation1);

                    setTimeout(function () {
                        operation1.fault("fault");
                    }, 100);

                    self.events.push(event);
                }
            };

            var bus = new EventBusMockup();

            var chain = new lazydevs.eventbus.EventChain(bus);

            chain.stopOnError = false;

            chain.add({type: "test-async-event-type-1", data: "test-async-event-data"})
                .add({type: "test-async-event-type-2", data: "test-async-event-data"})
                .add({type: "test-async-event-type-3", data: "test-async-event-data"})
                .start();

            assert.equals(chain.isComplete, false);
            assert.equals(chain.isFailed, false);

            setTimeout(function () {

                assert.equals(bus.events.length, 3);
                assert.equals(bus.events[0].type, "test-async-event-type-1");
                assert.equals(bus.events[1].type, "test-async-event-type-2");
                assert.equals(bus.events[2].type, "test-async-event-type-3");
                assert.equals(chain.isComplete, true);
                assert.equals(chain.isFailed, false);
                done();

            }, 500);
        },
        "EventChain:test-async-stop-on-error": function (done) {

            var EventBusMockup = function () {

                var self = this;

                self.events = [];

                self.publish = function (event) {

                    var operation1 = new lazydevs.eventbus.AsyncOperation();

                    event.step.addAsyncOperation(operation1);

                    setTimeout(function () {
                        operation1.fault("fault");
                    }, 100);

                    self.events.push(event);
                }
            };

            var bus = new EventBusMockup();

            var chain = new lazydevs.eventbus.EventChain(bus);

            chain.stopOnError = true;

            chain.add({type: "test-async-event-type-1", data: "test-async-event-data"})
                .add({type: "test-async-event-type-2", data: "test-async-event-data"})
                .add({type: "test-async-event-type-3", data: "test-async-event-data"})
                .start();

            assert.equals(chain.isComplete, false);
            assert.equals(chain.isFailed, false);

            setTimeout(function () {

                assert.equals(bus.events.length, 1);
                assert.equals(bus.events[0].type, "test-async-event-type-1");
                assert.equals(chain.isComplete, false);
                assert.equals(chain.isFailed, true);
                done();

            }, 500);
        }
    });
});

buster.testCase("EventBus", function (run) {

    run({
        "EventBus:test-publish-invalid-parameters": function (done) {

            assert.exception(function () {

                new lazydevs.eventbus.EventBus().publish(null);
            });

            assert.exception(function () {

                new lazydevs.eventbus.EventBus().publish({data: "data"});
            });

            done();
        },

        "EventBus:test-subscribe-invalid-parameters": function (done) {

            assert.exception(function () {

                new lazydevs.eventbus.EventBus().subscribe(null, function () {
                });
            });

            assert.exception(function () {

                new lazydevs.eventbus.EventBus().subscribe(50, function () {
                });
            });

            assert.exception(function () {

                new lazydevs.eventbus.EventBus().subscribe("event-type", null);
            });

            assert.exception(function () {

                new lazydevs.eventbus.EventBus().subscribe("event-type", 50);
            });

            done();
        },

        "EventBus:test-subscribe-and-publish": function (done) {

            var bus = new lazydevs.eventbus.EventBus();
            var handlerCalls = 0;

            // Subscribe an event handler
            bus.subscribe("test-subscribe-event-type", function (event) {
                handlerCalls++;
                assert.equals(event.type, "test-subscribe-event-type");
                assert.equals(event.data, "test-subscribe-event-data");
            });

            var event = {type: "test-subscribe-event-type", data: "test-subscribe-event-data"};

            bus.publish(event);

            assert.equals(handlerCalls, 1);

            // Subscribe a second handler
            bus.subscribe("test-subscribe-event-type", function (event) {
                handlerCalls++;
            });

            bus.publish(event);

            assert.equals(handlerCalls, 3);

            done();
        },

        "EventBus:test-subscribe-multiple": function (done) {

            var bus = new lazydevs.eventbus.EventBus();
            var handlerCalls = 0;

            // Subscribing the same handler twice should still only result in one handler call
            var handler = function (event) {
                handlerCalls++;
            };

            bus.subscribe("test-subscribe", handler);
            bus.subscribe("test-subscribe", handler);
            bus.subscribe("test-subscribe", handler);

            bus.publish({type: "test-subscribe"});

            assert.equals(handlerCalls, 1);

            done();
        },

        "EventBus:test-unsubscribe": function (done) {

            var bus = new lazydevs.eventbus.EventBus();
            var handlerCalls = 0;

            var handler = function (event) {
                handlerCalls++;
            };

            bus.subscribe("test-subscribe", handler);
            bus.unsubscribe("test-subscribe", handler);

            bus.publish({type: "test-subscribe"});

            assert.equals(handlerCalls, 0);

            done();
        }

    });
});
