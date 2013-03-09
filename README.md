Description
===========

This library helps you to use the observer pattern in Javascript projects. The implementation is based on an event bus that manages subscriptions (= function callbacks) to specific event types (= unique string keys). Your code can publish an event (= a javascript object) through the bus, which then will then notify all subscribers (= call all callbacks) that have been registered for the events type.

Also the library allows to publish multiple events in a specified order, even when asynchronous operations (e.g. AJAX calls) are involved.

Usage
=====

Basic event bus usage
---------------------

First create an event bus instance:

    var bus = new lazydevs.eventbus.EventBus();

Then subscribe to an event type:

    bus.subscribe('userLogin', function(event) {
        console.log(event.type == 'userLogin') // -> true
    });

After that the handler function will be called each time an event of the type *userLogin* is published.

You may also specify a scope object as third parameter that will be applied when the handler function is called:

    bus.subscribe('userLogin', this.onUserLogin, this);

Finally publish an event:

    bus.publish({
        type: 'userLogin',
        userName: 'john_doe'
    });

The event is a javascript object that **must have a *type* field** so that the bus can determine the events type. Otherwise you are free to set any other fields on the object to communicate data to the subscribers.

Call *unsubscribe* to remove a subscription:

    bus.unsubscribe('userLogin' handlerFunction);

After that the handler will not be called anymore when events of that type are published.

Chaining events
---------------

Using event chains you can publish multiple events in a sequence.

    bus.chain()
        .add( { type: 'userLogin' } )
        .add( { type: 'loadCurrentUserData' } )
        .add( { type: 'showWelcomeMessage' } )
        .start();

The chain will publish the added events in the order that they were added to the chain. By calling *start* the chain starts publishing the events.

Synchronizing handlers
----------------------

If one of your subscribed handlers needs to execute asynchronous code (e.g. an AJAX call) which you want to finish before the next event in the sequence is published, you can make the handler return an async operation object:

    bus.subscribe('loadUserData', function(event) {

        var operation = bus.operation();

        // Make an AJAX call using jQuery
        $.ajax('http://myserver/myapp/users/' + event.userId)
            .done(function(userData) {
                this.userData = userData;
                operation.result();
            })
            .fail(function() { operation.fault } );

        return operation;
    };

With this setup the chain will not publish the next event before the *operation.result()* call is made. If there are multiple asynchronous handlers subscribed to an event type then the chain will wait until all handlers are finished.

Note that it is also possible to indicate that our operation ran into an error/fault. In this case you can call *fault* on the operation. By default this stops the chain from publishing further events. If you want to indicate faults, but still want the chain to publish the remaining events you can change the *stopOnError* setting on the chain:

    var chain = bus.chain();

    chain.stopOnError = false;