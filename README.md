Description
===========

This library helps you to use the observer pattern in Javascript projects. The implementation is based on an event bus that manages subscriptions (= function callbacks) to specific event types (= unique string values). Your code can publish an event (= a JS object) through the bus, which then will then notify any subscribers (= call all callbacks) that have registered for the events type.

Also the library allows to publish multiple events in a specified order, even when asynchronous operations (e.g. AJAX calls) are involved.

Usage
=====

Basic event bus usage
-------------------

**Create an event bus**

    var bus = new lazydevs.eventbus.EventBus();

**Subscribing a handler**

    bus.subscribe('userLogin', function(event) {
        console.log('Event type: userLogin==' + event.type)
    }

You may also specify a scope object as third parameter that will be applied when the handler function is called.

**Publishing an event**

    bus.publish({
        type: 'userLogin',
        userName: 'john_doe'
    });

The event can be any JS object, but it **must have a *type* field** so that the bus can determine the events type.

**Unsubscribing a handler**

    bus.unsubscribe('userLogin' handlerFunction);

After that the handler will not be called anymore when events of that type are published.

Chaining events
---------------

Using event chains you can publish multiple events at once.

    bus.chain()
        .add( { type: 'userLogin' } )
        .add( { type: 'loadCurrentUserData' } )
        .add( { type: 'showWelcomeMessage' } )
        .start();

The chain will publish each event in the order that they were added to the chain. By calling *start* the chain starts publishing the events.

Synchronizing handlers
-------------------------------------

Often you will be faced with situations where you have to make an asynchronous function call and have to execute code as a result of that call.
  
Usually you would write a callback function that executes the corresponding result code. However if you have multiple asynchronous calls that need to be executed one after another your code becomes quite messy. It gets worse if the asynchronous calls must be made in different order in certain situations.


