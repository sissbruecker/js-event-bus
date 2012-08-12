/**
 * Created with IntelliJ IDEA.
 * User: sascha
 * Date: 12.08.12
 * Time: 17:57
 * To change this template use File | Settings | File Templates.
 */
define([], function () {

        var module = {};

        module.EventBus = function () {

            var self = this;

            self.publish = function (event) {

            };

            self.subscribe = function (type, handler) {

            };
        };


        module.EventChain = function (eventBus) {

            var self = this;

            self.eventBus = eventBus;
            self.stopOnError = true;
            self.steps = [];
            self.position = -1;
            self.isComplete = false;
            self.isFailed = false;

            self.addEvent = function (event) {

                if (!event)
                    throw new Error("event-bus.EventChain.addEvent needs an object as first argument");

                if (!event.type)
                    throw new Error("event-bus.EventChain.addEvent needs an object with a property 'type' as first argument");

                var step = new module.EventChainStep(event, self);

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


        module.EventChainStep = function (eventBus, event, chain) {

            var self = this;

            self.eventBus = eventBus;
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

                self.eventBus.publish(event);

                if (self.pending > 0)
                    return;

                self.complete();
            };

            self.addAsyncOperation = function (operation) {

                operation.addResponder(new module.Responder(self.resultHandler, self.errorHandler));
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


        module.AsyncOperation = function () {

            var self = this;

            self.responders = [];

            self.addResponder = function (responder) {

                if (!responder)
                    return;

                if (!(responder instanceof module.Responder))
                    throw new Error("event-bus.AsyncToken.addResponder needs an instance of type Responder as first argument");

                self.responders.push(responder);
            };

            self.result = function (data) {

                $.each(self.responders, function (key, value) {

                    value.result(data);
                });
            };

            self.fault = function (error) {

                $.each(self.responders, function (key, value) {

                    value.fault(error);
                });
            };
        };


        module.Responder = function (resultHandler, faultHandler) {

            var self = this;

            self.resultHandler = resultHandler;
            self.faultHandler = faultHandler;

            if (!resultHandler)
                throw new Error("event-bus.Responder.Constructor needs a function as first argument");

            self.result = function (data) {
                resultHandler.apply(data);
            };

            self.fault = function (error) {
                if (faultHandler)
                    faultHandler.apply(error);
            }
        };


        return module;
    }
)
;