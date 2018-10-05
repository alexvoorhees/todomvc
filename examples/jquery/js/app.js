/*global jQuery, Handlebars, Router */
jQuery(function ($) { //  // Is all of this contained within a jquery function?
	'use strict'; // Common phrase to keep syntax rules enforced.

	Handlebars.registerHelper('eq', function (a, b, options) { // Calling on a method of handlebars, checks if two things are equal and does one of two things.
		return a === b ? options.fn(this) : options.inverse(this);
	});

	var ENTER_KEY = 13; // These are odd, the numbers seem arbitrary, are variables often capitalized?
	var ESCAPE_KEY = 27;

	var util = {
		uuid: function () {
			/*jshint bitwise:false */
			var i, random; // Set up two variables we're going to use.
			var uuid = ''; // THe whole purpose is to create a random ID it looks like

			for (i = 0; i < 32; i++) { // So 31 times do the following...
				random = Math.random() * 16 | 0; // Get a random number between 1 and 16.
				if (i === 8 || i === 12 || i === 16 || i === 20) { // Id gets a - after every 8,12,16,20 digits like 12345678-1234-1234-1234-123456789... 
					uuid += '-';
				}
				uuid += (i === 12 ? 4 : (i === 16 ? (random & 3 | 8) : random)).toString(16); // Odd, this globs things on to the id, can't tell if its extra randomization or using what's already random.
			}

			return uuid; // So util.uuid creates a random 32 digit id.
		},
		pluralize: function (count, word) { // Take a count, and a word)
			return count === 1 ? word : word + 's'; // Is the count equal to 1? If not, add an s! Simple enough.
		},
		store: function (namespace, data) { // Take a namespace and data
			if (arguments.length > 1) { // If there's more than 1 argument (if there is data?)
				return localStorage.setItem(namespace, JSON.stringify(data)); // Store the name in data?
			} else { // Otherwise
				var store = localStorage.getItem(namespace); // Access what's already in storage.
				return (store && JSON.parse(store)) || []; // Either return what is stored, if it is a valid JSO, or a blank array
			}
		}
	};

	var App = {  // This contains the entire program, effectively, so our two objects are util and App
		init: function () { // Start the program, this happens automatically, one time.
			this.todos = util.store('todos-jquery'); // Access todos-jquery and either load prior data, or a blank array.
			this.todoTemplate = Handlebars.compile($('#todo-template').html()); // Sets up a structure from the handlebars library, possibly premade
			this.footerTemplate = Handlebars.compile($('#footer-template').html()); // Same as above, just a different template
			this.bindEvents(); // Sets all the interactivity between buttons and functions

			new Router({ // So, Router is a class, that seems to filter an array and render it using bound events?
				'/:filter': function (filter) {
					this.filter = filter; // This filters the list of todo based on the selected filter
					this.render(); // Then it renders them, and sets fields as checked or in focus as needed
				}.bind(this)
			}).init('/all'); // Odd syntax, I assume the router gets set up at the beginning of the app.
		},
		bindEvents: function () { // This seems to handle the button interactions.
			$('#new-todo').on('keyup', this.create.bind(this)); // New todos happen when enter is raised, keyup?
			$('#toggle-all').on('change', this.toggleAll.bind(this)); // Toggle all is linked to a checkbox, when that is checked, it togglesall
			$('#footer').on('click', '#clear-completed', this.destroyCompleted.bind(this)); // Connects to the clear-completed click button
			$('#todo-list') // This handles the 'list' itself.
				.on('change', '.toggle', this.toggle.bind(this)) // This one toggles completion of a single todo when checked
				.on('dblclick', 'label', this.edit.bind(this)) // This one edits todotext by double clicking
				.on('keyup', '.edit', this.editKeyup.bind(this)) // This one saves that edit when you press enter
				.on('focusout', '.edit', this.update.bind(this)) // This one also saves edits when you click away from the edited text
				.on('click', '.destroy', this.destroy.bind(this)); // Clicking the button of 'destroy' class deletes the todo
		},
		render: function () { // Ye olde display todos
			var todos = this.getFilteredTodos(); // Looks at the todos, filtered as selected by user
			$('#todo-list').html(this.todoTemplate(todos)); // Accesses the template for how todos should look
			$('#main').toggle(todos.length > 0); // If there's at least one todo, the app looks different
			$('#toggle-all').prop('checked', this.getActiveTodos().length === 0); // Sets the property of checked to true if there is no active todo, without direct clicking
			this.renderFooter(); // Function below
			$('#new-todo').focus(); // This doesn't seem to happen, it looks like focus stays on the input field.
			util.store('todos-jquery', this.todos); // Ah, so here is where data is saved between sessiosn
		},
		renderFooter: function () {
			var todoCount = this.todos.length; // Access total todos, store as todocount
			var activeTodoCount = this.getActiveTodos().length; // Get # of active todos too, store as activecount
			var template = this.footerTemplate({ // Create an object for footerTemplate to use
				activeTodoCount: activeTodoCount, // Active count
				activeTodoWord: util.pluralize(activeTodoCount, 'item'), // Item or items
				completedTodos: todoCount - activeTodoCount, // Non-active todo count
				filter: this.filter // Filter itself? Or store a filter for later.
			});

			$('#footer').toggle(todoCount > 0).html(template); // Toggle the entire footer if there are no todos
		},
		toggleAll: function (e) { // The function for our side checkmark
			var isChecked = $(e.target).prop('checked'); // Check the box, and match everything to it

			this.todos.forEach(function (todo) { // 
				todo.completed = isChecked; // 
			});

			this.render(); // render the box, ah, so render is our displaytodos.
		},
		getActiveTodos: function () {
			return this.todos.filter(function (todo) { // OH! I think filter checks each item in an array on a condition. Only showing what is true.
				return !todo.completed; // In this case, to get active todos, filter for ones that are not completed.
			});
		},
		getCompletedTodos: function () { // Like above
			return this.todos.filter(function (todo) { // Filter for todos that are completed, opposite of above
				return todo.completed;
			});
		},
		getFilteredTodos: function () { // Simple enough, checks the filter switch and returns the corresponding sorted todos.
			if (this.filter === 'active') {
				return this.getActiveTodos();
			}

			if (this.filter === 'completed') {
				return this.getCompletedTodos();
			}

			return this.todos;
		},
		destroyCompleted: function () { // I'd think, this gets the active todos, and makes that the entire pool. Filtering everything else
			this.todos = this.getActiveTodos();
			this.filter = 'all';
			this.render();
		},
		// accepts an element from inside the `.item` div and
		// returns the corresponding index in the `todos` array
		indexFromEl: function (el) { // take an element
			var id = $(el).closest('li').data('id'); // ID is that element's closest list item's id.
			var todos = this.todos; // Grab the todos
			var i = todos.length; // i is # of todos

			while (i--) { // # Of todo times...
				if (todos[i].id === id) {
					return i; // If i's id matches the element's, then return that spot in the array 
				}
			}
		},
		create: function (e) { // I assume this is our addTodo
			var $input = $(e.target); // Input field is the event's target
			var val = $input.val().trim(); // val is that input's value, without side whitespace

			if (e.which !== ENTER_KEY || !val) { // If the key pressed is not the enter key, or there is no input, don't create.
				return;
			}

			this.todos.push({  // Just like addTodo, although we now add an id as well. Perhaps to help in saving data.
				id: util.uuid(),
				title: val,
				completed: false
			});

			$input.val(''); // Clear the input field

			this.render(); // Render the bigger list.
		},
		toggle: function (e) { // Take a change event
			var i = this.indexFromEl(e.target); // i is the index of the toggle's todo
			this.todos[i].completed = !this.todos[i].completed; // Flip that todo's completion
			this.render(); // Render
		},
		edit: function (e) { // Take a doubleclick event
			var $input = $(e.target).closest('li').addClass('editing').find('.edit'); // don't know find. You add 'editing' to the closest list item 
			$input.val($input.val()).focus(); // return focus to the input field.
		},
		editKeyup: function (e) { // Other method of editing.
			if (e.which === ENTER_KEY) {
				e.target.blur(); // Enter works just like edit, it focuses out.
			}

			if (e.which === ESCAPE_KEY) {
				$(e.target).data('abort', true).blur(); // Escape is similar, but you tell it not to act on the focusout
			}
		},
		update: function (e) { // Focusout event
			var el = e.target; // Grab event's target, what you focused out of
			var $el = $(el); // Find that element again?
			var val = $el.val().trim(); // The value is the trimmed text inside that element

			if (!val) { // If there is no text, delete the todo.
				this.destroy(e);
				return;
			}

			if ($el.data('abort')) { // If you pushed escape, cancel the event
				$el.data('abort', false);
			} else {
				this.todos[this.indexFromEl(el)].title = val; // Otherwise, save that new value
			}

			this.render();
		},
		destroy: function (e) {
			this.todos.splice(this.indexFromEl(e.target), 1); // Simple deleteTodo, using our fancy index
			this.render();
		}
	};

App.init(); // This is like our initializeView function we had, basic setup tool. Seems common to have it at the end.
});
