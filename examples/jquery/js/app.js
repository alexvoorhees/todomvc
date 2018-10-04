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
				return (store && JSON.parse(store)) || [];
			}
		}
	};

	var App = {
		init: function () {
			this.todos = util.store('todos-jquery');
			this.todoTemplate = Handlebars.compile($('#todo-template').html());
			this.footerTemplate = Handlebars.compile($('#footer-template').html());
			this.bindEvents();

			new Router({
				'/:filter': function (filter) {
					this.filter = filter;
					this.render();
				}.bind(this)
			}).init('/all');
		},
		bindEvents: function () {
			$('#new-todo').on('keyup', this.create.bind(this));
			$('#toggle-all').on('change', this.toggleAll.bind(this));
			$('#footer').on('click', '#clear-completed', this.destroyCompleted.bind(this));
			$('#todo-list')
				.on('change', '.toggle', this.toggle.bind(this))
				.on('dblclick', 'label', this.edit.bind(this))
				.on('keyup', '.edit', this.editKeyup.bind(this))
				.on('focusout', '.edit', this.update.bind(this))
				.on('click', '.destroy', this.destroy.bind(this));
		},
		render: function () {
			var todos = this.getFilteredTodos();
			$('#todo-list').html(this.todoTemplate(todos));
			$('#main').toggle(todos.length > 0);
			$('#toggle-all').prop('checked', this.getActiveTodos().length === 0);
			this.renderFooter();
			$('#new-todo').focus();
			util.store('todos-jquery', this.todos);
		},
		renderFooter: function () {
			var todoCount = this.todos.length;
			var activeTodoCount = this.getActiveTodos().length;
			var template = this.footerTemplate({
				activeTodoCount: activeTodoCount,
				activeTodoWord: util.pluralize(activeTodoCount, 'item'),
				completedTodos: todoCount - activeTodoCount,
				filter: this.filter
			});

			$('#footer').toggle(todoCount > 0).html(template);
		},
		toggleAll: function (e) {
			var isChecked = $(e.target).prop('checked');

			this.todos.forEach(function (todo) {
				todo.completed = isChecked;
			});

			this.render();
		},
		getActiveTodos: function () {
			return this.todos.filter(function (todo) {
				return !todo.completed;
			});
		},
		getCompletedTodos: function () {
			return this.todos.filter(function (todo) {
				return todo.completed;
			});
		},
		getFilteredTodos: function () {
			if (this.filter === 'active') {
				return this.getActiveTodos();
			}

			if (this.filter === 'completed') {
				return this.getCompletedTodos();
			}

			return this.todos;
		},
		destroyCompleted: function () {
			this.todos = this.getActiveTodos();
			this.filter = 'all';
			this.render();
		},
		// accepts an element from inside the `.item` div and
		// returns the corresponding index in the `todos` array
		indexFromEl: function (el) {
			var id = $(el).closest('li').data('id');
			var todos = this.todos;
			var i = todos.length;

			while (i--) {
				if (todos[i].id === id) {
					return i;
				}
			}
		},
		create: function (e) {
			var $input = $(e.target);
			var val = $input.val().trim();

			if (e.which !== ENTER_KEY || !val) {
				return;
			}

			this.todos.push({
				id: util.uuid(),
				title: val,
				completed: false
			});

			$input.val('');

			this.render();
		},
		toggle: function (e) {
			var i = this.indexFromEl(e.target);
			this.todos[i].completed = !this.todos[i].completed;
			this.render();
		},
		edit: function (e) {
			var $input = $(e.target).closest('li').addClass('editing').find('.edit');
			$input.val($input.val()).focus();
		},
		editKeyup: function (e) {
			if (e.which === ENTER_KEY) {
				e.target.blur();
			}

			if (e.which === ESCAPE_KEY) {
				$(e.target).data('abort', true).blur();
			}
		},
		update: function (e) {
			var el = e.target;
			var $el = $(el);
			var val = $el.val().trim();

			if (!val) {
				this.destroy(e);
				return;
			}

			if ($el.data('abort')) {
				$el.data('abort', false);
			} else {
				this.todos[this.indexFromEl(el)].title = val;
			}

			this.render();
		},
		destroy: function (e) {
			this.todos.splice(this.indexFromEl(e.target), 1);
			this.render();
		}
	};

	App.init(); // This is like our initializeView function we had, basic setup tool. Seems common to have it at the end.
});
