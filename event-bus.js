/**
 * Created with IntelliJ IDEA.
 * User: sascha
 * Date: 12.08.12
 * Time: 17:57
 * To change this template use File | Settings | File Templates.
 */

var lazydevs = lazydevs || {};

lazydevs.eventbus = lazydevs.eventbus || {};

/**
 * Event bus implementation that manages subscriptions to events and can publish events
 * @constructor
 */
lazydevs.eventbus.EventBus = function () {

    this.subscriptions = {};
};

/**
 * Publishes an event object through the event bus.
 * The event object is expected to have a type field that determines which subscribers should be called.
 * The bus calls all methods that are subscribed to the events type
 * @param {object} event
 */
lazydevs.eventbus.EventBus.prototype.publish = function (event) {

    if (!event)
        throw new Error("EventBus.publish needs an object 'event' as first argument");

    if (!event.type || !(typeof(event.type) == "string"))
        throw new Error("EventBus.publish needs an object with a string property 'type' as first argument");

    // If there are no subscriptions for this event type then return
    if (!this.subscriptions[event.type])
        return;

    // Call each handler for this event type
    var eventTypeSubscriptions = this.subscriptions[event.type];

    for (var i = 0; i < eventTypeSubscriptions.length; i++) {

        var subscription = eventTypeSubscriptions[i];

        var result = subscription.handler.apply(subscription.scope, [event]);

        // If the handler returns an async operation then add it to the step
        if(result instanceof lazydevs.eventbus.AsyncOperation && event.step instanceof lazydevs.eventbus.EventChainStep) {

            event.step.addAsyncOperation(result);
        }
    }
};

/**
 * Subscribes a handler for an event type.
 * Whenever the bus publishes an event with the specified event type then the handler function will be called.
 * @param {string} type The type of the event that the handler should be subscribed to
 * @param {function} handler The handler that should be called when an event of the specified type occurs
 * @param {object} scope The scope that should be applied for calling the handler
 */
lazydevs.eventbus.EventBus.prototype.subscribe = function (type, handler, scope) {

    // Check argument types
    if (typeof type !== 'string')
        throw new Error("EventBus.subscribe needs a string 'type' as first argument");

    if (typeof handler !== 'function')
        throw new Error("EventBus.subscribe needs a function 'handler' as second argument");

    // Create handler array if it does not exist
    if (!this.subscriptions[type]) {
        this.subscriptions[type] = [];
    }

    // Check if handler is already subscribed
    var eventTypeSubscriptions = this.subscriptions[type];

    for (var i = 0; i < eventTypeSubscriptions.length; i++) {
        if (eventTypeSubscriptions[i].handler == handler)
            return;
    }

    // Add subscription
    var subscription = { handler: handler, scope: scope};

    eventTypeSubscriptions.push(subscription);
};

/**
 * Remove a handler subscription for an event type.
 * Use this if you don't want any further calls to your handler when an event of the specified type is published.
 * @param {string} type The event type from which you want to remove a subscription
 * @param {function} handler A handler function that has already been subscribed to the specified type
 */
lazydevs.eventbus.EventBus.prototype.unsubscribe = function (type, handler) {

    // TODO: Unsubscribing without a handler could unsubscribe all handlers - useful for subscribed inline functions

    // Check argument types
    if (typeof type !== 'string')
        throw new Error("EventBus.subscribe needs a string 'type' as first argument");

    if (typeof handler !== 'function')
        throw new Error("EventBus.subscribe needs a function 'handler' as second argument");

    // If there are no subscriptions for this event type then return
    if (!this.subscriptions[type])
        return;

    // Remove handler from handler array
    var eventTypeSubscriptions = this.subscriptions[type];

    for (var i = 0; i < eventTypeSubscriptions.length; i++) {

        if (eventTypeSubscriptions[i].handler == handler) {

            eventTypeSubscriptions.splice(i, 1);
            return;
        }
    }
};

/**
 * Shortcut for creating an event chain for this event bus instance without writing the complete namespace.
 * @returns {lazydevs.eventbus.EventChain}
 */
lazydevs.eventbus.EventBus.chain = function() {

    return new lazydevs.eventbus.EventChain(this);
};

/**
 * Shortcut for creating an async operation without writing the complete namespace
 * @returns {lazydevs.eventbus.AsyncOperation}
 */
lazydevs.eventbus.EventBus.async = function() {

    return new lazydevs.eventbus.AsyncOperation();
};

lazydevs.eventbus.EventChain = function (eventBus) {

    this.eventBus = eventBus;
    this.stopOnError = true;
    this.steps = [];
    this.position = -1;
    this.isComplete = false;
    this.isFailed = false;
};

lazydevs.eventbus.EventChain.prototype.add = function (event) {

    if (!event)
        throw new Error("EventChain.addEvent needs an object 'event' as first argument");

    if (!event.type || !(typeof(event.type) == "string"))
        throw new Error("EventChain.addEvent needs an object with a string property 'type' as first argument");

    var step = new lazydevs.eventbus.EventChainStep(this, event);

    this.steps.push(step);

    return this;
};

lazydevs.eventbus.EventChain.prototype.start = function () {

    this.position = -1;
    this.isComplete = false;
    this.isFailed = false;

    this.proceed();
};

lazydevs.eventbus.EventChain.prototype.proceed = function () {

    if (this.position + 1 >= this.steps.length) {
        this.isComplete = true;
        return;
    }

    this.position++;

    var step = this.steps[this.position];

    step.proceed();
};

lazydevs.eventbus.EventChain.prototype.stepComplete = function () {

    this.proceed();
};

lazydevs.eventbus.EventChain.prototype.stepError = function () {

    if (!this.stopOnError)
        this.proceed();
    else
        this.isFailed = true;
};


lazydevs.eventbus.EventChainStep = function (chain, event) {

    this.event = event;
    this.event.step = this;
    this.chain = chain;
    this.pending = 0;
    this.isComplete = false;
    this.isFailed = false;
};

lazydevs.eventbus.EventChainStep.prototype.proceed = function () {

    this.pending = 0;
    this.isComplete = false;
    this.isFailed = false;

    this.chain.eventBus.publish(this.event);

    if (this.pending > 0)
        return;

    this.complete();
};

lazydevs.eventbus.EventChainStep.prototype.addAsyncOperation = function (operation) {

    operation.addResponder(new lazydevs.eventbus.Responder(this.resultHandler, this.errorHandler, this));
    this.pending++;
};

lazydevs.eventbus.EventChainStep.prototype.resultHandler = function () {

    if (this.pending > 0)
        this.pending--;

    if (!this.isFailed && this.pending == 0)
        this.complete();
};

lazydevs.eventbus.EventChainStep.prototype.errorHandler = function () {

    if (this.pending > 0)
        this.pending--;

    this.error();
};

lazydevs.eventbus.EventChainStep.prototype.complete = function () {

    this.isComplete = true;
    this.chain.stepComplete();
};

lazydevs.eventbus.EventChainStep.prototype.error = function () {

    this.isComplete = true;
    this.isFailed = true;
    this.chain.stepError();
};


lazydevs.eventbus.AsyncOperation = function () {

    this.responders = [];
};

lazydevs.eventbus.AsyncOperation.prototype.addResponder = function (responder) {

    if (!responder)
        return;

    if (!(responder instanceof lazydevs.eventbus.Responder))
        throw new Error("AsyncToken.addResponder needs an instance of type Responder as first argument");

    this.responders.push(responder);
};

lazydevs.eventbus.AsyncOperation.prototype.result = function (data) {

    for (var i = 0; i < this.responders.length; i++) {
        this.responders[i].result(data);
    }
};

lazydevs.eventbus.AsyncOperation.prototype.fault = function (error) {

    for (var i = 0; i < this.responders.length; i++) {
        this.responders[i].fault(error);
    }
};


lazydevs.eventbus.Responder = function (resultHandler, faultHandler, scope) {

    this.resultHandler = resultHandler;
    this.faultHandler = faultHandler;
    this.scope = scope;

    if (!resultHandler || typeof resultHandler !== 'function')
        throw new Error("Responder.constructor needs a function 'resultHandler' as first argument");

    if (faultHandler && typeof faultHandler !== 'function')
        throw new Error("Responder.constructor needs a function 'faultHandler' as second argument");

};

lazydevs.eventbus.Responder.prototype.result = function (data) {
    this.resultHandler.apply(this.scope, [data]);
};

lazydevs.eventbus.Responder.prototype.fault = function (error) {
    if (this.faultHandler)
        this.faultHandler.apply(this.scope, [error]);
};
