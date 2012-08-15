/**
 * Created with IntelliJ IDEA.
 * User: sascha
 * Date: 12.08.12
 * Time: 17:57
 * To change this template use File | Settings | File Templates.
 */
define(function () {

        var EventBus = {};

        EventBus.EventBus = function () {

            var self = this;

            self.subscriptions = {};

            self.publish = function (event) {

                if (!event)
                    throw new Error("event-bus.EventBus.publish needs an object 'event' as first argument");

                if (!event.type || !(typeof(event.type) == "string"))
                    throw new Error("event-bus.EventBus.publish needs an object with a string property 'type' as first argument");

                // If there are no subscriptions for this event type then return
                if (!self.subscriptions[event.type])
                    return;

                // Call each handler for this event type
                var handlers = self.subscriptions[event.type];

                for (var i = 0; i < handlers.length; i++) {

                    handlers[i].apply(null, [event]);
                }
            };

            self.subscribe = function (type, handler) {

                // Check argument types
                if (typeof type !== 'string')
                    throw new Error("event-bus.EventBus.subscribe needs a string 'type' as first argument");

                if (typeof handler !== 'function')
                    throw new Error("event-bus.EventBus.subscribe needs a function 'handler' as second argument")

                // Create handler array if it does not exist
                if (!self.subscriptions[type]) {
                    self.subscriptions[type] = [];
                }

                // Check if handler is already subscribed
                var handlers = self.subscriptions[type];

                for (var i = 0; i < handlers.length; i++) {
                    if (handlers[i] == handler)
                        return;
                }

                // Add handler
                handlers.push(handler);
            };

            self.unsubscribe = function (type, handler) {

                // Check argument types
                if (typeof type !== 'string')
                    throw new Error("event-bus.EventBus.subscribe needs a string 'type' as first argument");

                if (typeof handler !== 'function')
                    throw new Error("event-bus.EventBus.subscribe needs a function 'handler' as second argument")

                // If there are no subscriptions for this event type then return
                if (!self.subscriptions[type])
                    return;

                // Remove handler from handler array
                var handlers = self.subscriptions[type];

                for (var i = 0; i < handlers.length; i++) {

                    if (handlers[i] == handler) {

                        handlers.splice(i, 1);
                        return;
                    }
                }
            }
        };


        EventBus.EventChain = function (eventBus) {

            var self = this;

            self.eventBus = eventBus;
            self.stopOnError = true;
            self.steps = [];
            self.position = -1;
            self.isComplete = false;
            self.isFailed = false;

            self.addEvent = function (event) {

                if (!event)
                    throw new Error("event-bus.EventChain.addEvent needs an object 'event' as first argument");

                if (!event.type || !(typeof(event.type) == "string"))
                    throw new Error("event-bus.EventChain.addEvent needs an object with a string property 'type' as first argument");

                var step = new EventBus.EventChainStep(self, event);

                self.steps.push(step);

                return self;
            };

            self.start = function () {

                self.position = -1;
                self.isComplete = false;
                self.isFailed = false;

                self.proceed();
            };

            self.proceed = function () {

                if (self.position + 1 >= self.steps.length) {
                    self.isComplete = true;
                    return;
                }

                self.position++;

                var step = self.steps[self.position];

                step.proceed();
            };

            self.stepComplete = function () {

                self.proceed();
            };

            self.stepError = function () {

                if (!self.stopOnError)
                    self.proceed();
                else
                    self.isFailed = true;
            };
        };


        EventBus.EventChainStep = function (chain, event) {

            var self = this;

            self.event = event;
            self.event.step = self;
            self.chain = chain;
            self.pending = 0;
            self.isComplete = false;
            self.isFailed = false;

            self.proceed = function () {

                self.pending = 0;
                self.isComplete = false;
                self.isFailed = false;

                self.chain.eventBus.publish(self.event);

                if (self.pending > 0)
                    return;

                self.complete();
            };

            self.addAsyncOperation = function (operation) {

                operation.addResponder(new EventBus.Responder(self.resultHandler, self.errorHandler));
                self.pending++;
            };

            self.resultHandler = function (data) {

                if (self.pending > 0)
                    self.pending--;

                if (!self.isFailed && self.pending == 0)
                    self.complete();
            };

            self.errorHandler = function (error) {

                if (self.pending > 0)
                    self.pending--;

                self.error();
            };

            self.complete = function () {

                self.isComplete = true;
                self.chain.stepComplete();
            };

            self.error = function () {

                self.isComplete = true;
                self.isFailed = true;
                self.chain.stepError();
            };

        };


        EventBus.AsyncOperation = function () {

            var self = this;

            self.responders = [];

            self.addResponder = function (responder) {

                if (!responder)
                    return;

                if (!(responder instanceof EventBus.Responder))
                    throw new Error("event-bus.AsyncToken.addResponder needs an instance of type Responder as first argument");

                self.responders.push(responder);
            };

            self.result = function (data) {

                for (var i = 0; i < self.responders.length; i++) {
                    self.responders[i].result(data);
                }
            };

            self.fault = function (error) {

                for (var i = 0; i < self.responders.length; i++) {
                    self.responders[i].fault(error);
                }
            };
        };


        EventBus.Responder = function (resultHandler, faultHandler) {

            var self = this;

            self.resultHandler = resultHandler;
            self.faultHandler = faultHandler;

            if (!resultHandler)
                throw new Error("event-bus.Responder.Constructor needs a function 'resultHandler' as first argument");

            self.result = function (data) {
                resultHandler.apply(null, [data]);
            };

            self.fault = function (error) {
                if (faultHandler)
                    faultHandler.apply(null, [error]);
            }
        };

        return EventBus;
    }
);