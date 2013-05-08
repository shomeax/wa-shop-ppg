(function($) {
	$.wa_blog.editor = {

		options : {
			blogs: {},
			content_id : 'post_text',
			current_blog_id:null,
			//dateFormat: 'yy-mm-dd',
			dateMonthCount: 2,
			dateShowWeek: false,
			cut_link_label_defaul: '',
			version: '1.0'
		},

		transliterated: false,

		blog_statuses: {
			'private': 'private',
			'public': 'public'
		},

		init : function(options) {

			var self = this;

			self.options = $.extend(self.options, options);

			self.postUrlWidget = setupPostUrlWidget();

			self.inlineSaveController = setupInlineSave({

				beforeSave: function() {
					if (!validateDatetime()) {
						return false;
					}
					$.wa_blog.editor.onSubmit();
				},

				afterSave: function(data) {
					$('#b-post-save-button').removeClass('yellow').addClass('green');
					$('#postpublish-edit').removeClass('yellow').addClass('green');
					self.postUrlWidget.resetEditReady();
					self.postUrlWidget.updateSlugs(data.url, data.preview_hash||false);
					resetEditDatetimeReady.call($('#inline-edit-datetime').get(0), data.formatted_datetime);
					if (self.inlineSaveController.getAction() == 'draft') {
						$('#post-url-field .small').removeClass('small').addClass('hint');
					}
				}

			});

			setupSwitcherWidget();
			initDatepickers(self.options);
			initDialogs();

			var editor = null;
			try {
				editor = $.storage.get('blog/editor');
			} catch(e) {
				this.log('Exception: '+e.message + '\nline: '+e.fileName+':'+e.lineNumber);
			}

			if (editor) {
				editor = editor.replace(/\W+/g,'');
			} else {
				for(editor in this.editors) {
					break;
				}
			}

			if (!this.selectEditor(editor, true)) {
				for(editor in this.editors) {
					if (this.selectEditor(editor, true)) {
						break;
					}
				}
			}

			$.wa.dropdownsCloseEnable();
			$('.change-blog').click($.wa_blog.editor.changeBlogHandler);
			$('#postpublish-dialog input[name="publish_blog_id"]').change($.wa_blog.editor.changePublishBlogHandler);


			$('#post-title').keyup(function() {
				var input = $(this),
					msg = input.next('.maxlength'),
					maxlength = parseInt(input.attr('maxlength'));

				if (maxlength && input.val().length >= maxlength && !msg.length) {
					input.after('<em class="hint maxlength">'
							+ $_('input_maxlength').replace(/%d/, maxlength)
							+ '</em>');
				} else if ((!maxlength || input.val().length < maxlength) && msg.length) {
					msg.remove();
				}
			});

			// link for start inline-editing of date
			$('#inline-edit-datetime').click(function() {
				setEditDatetimeReady.call(this);
			});

			$('.b-post-editor-toggle li a').click(this.editorTooggle);

			$(document).keydown(function(e) {
		  		// ctrl + s
				if (e.ctrlKey && e.keyCode == 83) {
					self.onSaveHotkey(e);
				}
			});

			$('.time').focus(function() {
				hideDatetimeError($(this).parent().find('.datepicker'));
			});

			$('#post-form').submit(function() {
				return false;
			});


			//deadline
			function initDialogs()
			{

				$('.dialog-edit').each(function() {
					/*$(this).parents('.block:first').click(function(e) {
						if ($(e.target).hasClass('dialog-edit')) {
							return linkClickHandler.call(e.target);
						}
					});*/
					$(this).click(function(e) {
							e.preventDefault();
							return linkClickHandler.call(e.target);
					});
				});

				function linkClickHandler()
				{
					var id = $(this).attr('id').replace(/-.*$/,'');

					$.wa_blog.editor.currentDialog =
						$("#" + id +"-dialog").waDialog({
							disableButtonsOnSubmit: true,
							onLoad: function () {
								$(this).find("input,select").removeAttr('disabled');
								$('.user-date-format').text(getDateFormat());
							},
							onSubmit: function () {
								return false;
							},
							onCancel: function(dialog) {
								$(this).find("input:text,select").each(function(id){
									$(this).value = $(this).defaultValue;
									$(this).attr('disabled','disabled');
								});
							}
						});

					return false;
				}
			}

			// ====== Functions declarations section ========

			function setEditDatetimeReady()
			{
				$(this).hide();
				$(this).parent().find('.datetime').show();
				$('#current-time').hide();
				$('.user-date-format').text(getDateFormat());
			}

			function resetEditDatetimeReady(datetime)
			{
				$(this).show();
				$(this).parent().find('.datetime').hide();
				if (datetime) {
					$('#current-time').text(datetime);
				}
				$('#current-time').show();
			}

			/**
			 * Find nearest to input element with class .hint
			 * @param input
			 * @returns $ wrapped found element
			 */
			function findHintToDatepicker(input)
			{
				var hint = input.siblings('.hint:first');
				if (hint.length <= 0) {
					hint = input.parent().siblings('.hint:first');
				}
				return hint;
			}

			/**
			 * Initial validating date before send request to server
			 * @returns {Boolean}
			 */
			function validateDatetime()
			{
				var input = $('.datepicker:not(:disabled)');

				var success = true;

				if (input.length > 0) {

					var timeInputes = input.parent('.datetime').find('.time');

					if (timeInputes.length > 0) {
						if (timeInputes.get(0) && !validateHour(timeInputes.eq(0).val())) {
							success = false;
						}
						if (timeInputes.get(1) && !validateMinute(timeInputes.eq(1).val())) {
							success = false;
						}
					}

					if (!success) {
						showDatetimeError(input);
					}

				}

				return success;
			}

			function hideDatetimeError(datepickerInput)
			{
				datepickerInput.parent().find('input[type=text]').removeClass('error');
				findHintToDatepicker(datepickerInput).removeClass('errormsg');
			}

			function showDatetimeError(datepickerInput)
			{
				datepickerInput.parent().find('input[type=text]').addClass('error');
				findHintToDatepicker(datepickerInput).addClass('errormsg');
			}

			/**
			 * Validate hour
			 * @param hour
			 * @returns {Boolean}
			 */
			function validateHour(hour)
			{
				return hour >= 0 && hour <= 24;
			}

			/**
			 * Validate Minute
			 * @param minute
			 * @returns {Boolean}
			 */
			function validateMinute(minute)
			{
				return minute >= 0 && minute <= 60;
			}

			/**
			 * Init datepickers of form and dialogs
			 *
			 * @param options
			 */
			function initDatepickers(options)
			{
				var datepicker_options = {
					changeMonth : true,
					changeYear : true,
					shortYearCutoff: 2,
					showOtherMonths: options.dateMonthCount < 2,
					selectOtherMonths: options.dateMonthCount < 2,
					stepMonths: options.dateMonthCount,
					numberOfMonths: options.dateMonthCount,
					showWeek: options.dateShowWeek,
					gotoCurrent: true,
					constrainInput: false,

					beforeShow : function() {
						// hack! It's needed after-show-callback for changing z-index, but it doesn't exist
						setTimeout(function() {
							// make min z-index 10
							var zIndex = $('#ui-datepicker-div').css('z-index');
							if (zIndex < 10) {
								$('#ui-datepicker-div').css('z-index', 10);
							}
						}, 0);
					}
				};

				$('.datepicker').datepicker(datepicker_options)
					.filter('input[name^=schedule_datetime]').datepicker('option', 'minDate', new Date());

				// hide current datepicker by hardcoding style, because jquery.ui.datepicker
				// has bag and doesn't hide calendar by oneself
				$('#ui-datepicker-div').hide();

				$('.datepicker').focus(function() {
					hideDatetimeError($(this));
				});

			}

			/**
			 * Get format in what inputed dates must be
			 *
			 * @returns {String}
			 */
			function getDateFormat()
			{
				return $.datepicker._defaults.dateFormat.toUpperCase().replace('YY', 'YYYY');
			}

			// ===== Widgets and classes declaration section ====

			function setupSwitcherWidget()
			{
				var switcher = $('#allow-comment-switcher');

				handler.call(switcher.get(0));

				switcher.iButton({
					labelOn : '',
					labelOff : '',
					className: 'mini'
				}).change(handler);

				function handler()
				{
					var onLabelSelector = '#' + this.id + '-on-label',
					offLabelSelector = '#' + this.id + '-off-label';

					if (!this.checked) {
						$(onLabelSelector).addClass('b-unselected');
						$(offLabelSelector).removeClass('b-unselected');
					} else {
						$(onLabelSelector).removeClass('b-unselected');
						$(offLabelSelector).addClass('b-unselected');
					}
				}
			}

			/**
			 * Setup widget for display/typing url of post
			 *
			 * Widget dynamicly offers version of url by transliterate title of post
			 */
			function setupPostUrlWidget() {

				var postUrlHandler;
				var cachedSlug = null;
				var cache = {};
				var changeBlog = function() {}

				init();

				/**
				 *
				 * Get descriptor from server by using ajax
				 *
				 * @param blogId
				 * @param postId
				 * @param postTitle
				 * @returns object descriptor
				 */
				function getDescriptor(blogId, postId, postTitle, fn)
				{
					var descriptor = null,
						request = { 'post_title': postTitle, 'post_id': postId, 'blog_id': blogId },
						cache_key = [blogId, postId, postTitle].join('&');

					if (cache[cache_key]) {
						fn(cache[cache_key]);
					} else {
						if (cachedSlug != null) {
							request['slug'] = cachedSlug;
						}
						$.ajax({
							url : '?module=post&action=getPostUrl',
							data: request,
							dataType: 'json',
							type: 'post',
							async: false,
							success: function(response) {
								descriptor = response['data'];
								cache[cache_key] = descriptor;
								$.wa_blog.editor.transliterated = true;
								fn(descriptor);
							}
						});
					}
				}

				/**
				 *
				 * Show widget. View of widget depends on descriptor
				 *
				 * @param object descriptor
				 */
				function show(descriptor)
				{
					if (!descriptor) {
						$('#post-url-field').show('fast');
						return;
					}

					var wholeUrl = descriptor.link + descriptor.slug + '/';

					$('#url-link').text(wholeUrl);
					$('#url-link').attr('href', descriptor.preview_hash
							? wholeUrl + '?preview=' + descriptor.preview_hash
							: wholeUrl
					);
					$('#pure-url').text(descriptor.link);

					if (descriptor.slug && !cachedSlug) {
						$('#post-url').val(descriptor.slug);
						cachedSlug = descriptor.slug;
					} else {
						$('#post-url').val(cachedSlug);
					}

					var className = descriptor.is_adding ? 'small'
										: descriptor.is_published ? 'small' : 'hint';

					var previewText = $('#post-url-field span:first').contents().filter(function() { return this.nodeType == 3; }).get(0).nodeValue;

					if (descriptor.other_links && descriptor.other_links instanceof Array) {
						var data = [];
						for (k in descriptor.other_links) {
							data.push({
								previewText: previewText,
								className: className,
								slug: cachedSlug,
								link: descriptor.other_links[k],
								href : descriptor.preview_hash
											? descriptor.other_links[k] + cachedSlug + '/?preview=' + descriptor.preview_hash
											: descriptor.other_links[k] + cachedSlug + '/'
							});
						}
						var tmpl = descriptor.is_adding
							?   '<span class="${className}">${previewText}${link}' +
									'<span class="slug">{{if slug}}${slug}/{{/if}}</span>' +
								'</span><br>'
							: '<span class="${className}">${previewText}<a target="_blank" href="${href}">${link}' +
									'<span class="slug">{{if slug}}${slug}/{{/if}}</span></a>' +
								'</span><br>';

						var icon = $('#post-url-field').children(':first');

						if (icon.is('.icon10')) {
							tmpl = '<i class="' + icon.attr('class') + '"></i> ' + tmpl;
						}

						$('#other-urls').html($.tmpl(tmpl, data));
					}

					$('#post-url-field').show('fast');
				}

				/**
				 * Hide widget
				 */
				function hide()
				{
					$('#post-url-field').hide('fast');
					$('#post-url').val('');
				}

				function updateSlugs(slug,preview_hash)
				{
					if (slug) {
						cachedSlug = slug;
					}
					$('.slug').each(function() {
						if (cachedSlug) {
							var a = $(this).text(cachedSlug + '/').parents('a:first');
							a.attr('href', a.text()+(preview_hash?'?preview='+preview_hash:''));
						} else {
							$(this).text('');
						}
					});
				}

				/**
				 * Initializing widget
				 */
				function init()
				{
					if (!$('#post-url-field').length || $('#post-url-field').hasClass('no-settlements')) {
						changeBlog = function(blog_status) {
							if (blog_status == $.wa_blog.editor.blog_statuses['public']) {
								show();
							} else {
								hide();
							}
						};
						return;
					}
					postUrlHandler = function() {
						var postId = $('input[name=post_id]').val();
						if (!postId && !this.value) {
							hide();
							return;
						}
						var blogId = $('input[name=blog_id]').val();
						getDescriptor(blogId, postId, this.value, function(descriptor) {
							if (descriptor && !descriptor.is_private_blog) {
								show(descriptor);
							} else {
								hide();
							}
						});
					};

					var postId = $('#post-form').find('input[name=post_id]').val();

					if (!postId) {	// only when adding post handle blur-event
						$('#post-title').blur(function() {
							var self = this;
							setTimeout(function() {
								if (cachedSlug == null) {
									postUrlHandler.call(self);
								}
							}, 200);	// first we need wait for .change-blog handler
						});
					}

					changeBlog = function() {
						postUrlHandler.call($('#post-title').get(0));
					};

					$('#url-edit-link').click(setEditReady);

					$('#post-url').keyup(function(e) {
						if (e.keyCode != 9) {		// ignore when blur from other input to this input
							if(this.value != cachedSlug) {
								updateSlugs(this.value);
							}
						}
					});
				}

				function setEditReady()
				{
					$('#url-editable').hide();
					$('#url-edit').show();
					$('#post-url').focus();
				}

				function resetEditReady()
				{
					$('#url-editable').show();
					$('#url-edit').hide();
				}

				return {
					setEditReady: setEditReady,
					resetEditReady: resetEditReady,
					updateSlugs: updateSlugs,
					changeBlog:changeBlog
				};

			}	// setupPostUrlWidget

			/**
			 *
			 */
			function setupInlineSave(options)
			{
				options = options || {};

				var action = '';
				var inline = false;

				var beforeSave = options.beforeSave || function() {};
				var afterSave = options.afterSave || function() {};

				init();

				function init()
				{
					$('input[type=submit], input[type=button], a.js-submit').click(function() {
						if($(this).hasClass('dialog-edit')) {
							return false;
						}
						if($(this).hasClass('js-submit')) {
							var question = $(this).attr('title')||$(this).text()||'Are you sure?';
							if(!confirm(question)) {
								return false;
							}
						}
						if ($('#post-id').val() && (this.id == 'b-post-save-button' || this.id == 'b-post-save-draft-button')) {
							inline = true;
						}
						action = this.name;
						if (action == 'deadline' || action == 'schedule') {
							$('#' + this.name + '-dialog').find('input[name^=datetime]').attr('disabled', false);
						}
						save();
						return false;
					});
					$('#post-url').focus(function() {
						//hideErrorMsg($(this));
					});
				}

				function showErrorMsg(input, msg)
				{
					var selector = '#message-' + input.attr('id');
					input.addClass('error');
					$(selector).addClass('errormsg').text(msg);
				}

				function hideErrorMsg(input)
				{
					var selector = '#message-' + input.attr('id');
					input.removeClass('error');
					$(selector).removeClass('errormsg').text('');
				}

				function showErrors(errors)
				{
					if (errors.url) {
						$('#post-url-field').show();
						showErrorMsg($('#post-url'), errors.url);
					}
					if (errors.datetime) {
						var input = $('.datepicker:not(:disabled)');
						if (input.length) {
							showDatetimeError(input);
						}
					}
				}

				function hideErrors()
				{
					hideErrorMsg($('#post-url'));
					var input = $('.datepicker:not(:disabled)');
					if (input.length) {
						input.datepicker('hide');
						hideDatetimeError(input);
					}
				}

				function save()
				{
					if (beforeSave() !== false) {
						//hideErrors();
						submit(afterSave);
					}
				}

				function onFail(errors)
				{
					if (!errors.datetime) {
						if (action == 'deadline') {
							var date = $('#deadline-dialog .datepicker').val();
							if (date) {
								$('#publication-deadline-changable-part').html($.tmpl('publication-deadline-setted', {
									date: date
								}));
							} else {
								$('#publication-deadline-changable-part').html($.tmpl('publication-deadline-setted'));
							}
							$('#b-post-save-draft-button').attr('name', 'deadline');
						}
					}
				}

				function submit(fn)
				{
					var text = $.wa_blog.editor.wysiwygToHtml($('#post_text', '#post-form').val());
					$('#post_text', '#post-form').val(text);

					var data = $('#post-form').serialize() + '&' + action + '=1';

					data += inline ? '&inline=1' : '';
					data += !$.wa_blog.editor.transliterated ? '&transliterate=1' : '';

					fn = fn || function() {};

					updateStatusIcon('loading');

					$.ajax({
						url : '?module=post&action=save',
						data: data,
						dataType: 'json',
						type: 'post',
						success: function(response) {

							if (response.status == 'fail') {
								if (!response.errors.datetime) {
									$.wa_blog.editor.closeCurrentDialog();
								}
								showErrors(response.errors);
								onFail(response.errors);
							} else if (response.data.redirect) {
								location.href = response.data.redirect;
							} else {
								fn(response.data);
								if (response.data.id) {
									$('#post-id').val(response.data.id);
								}
								updateStatusIcon('saved');
							}

							inline = false;
							updateStatusIcon('');
						},
						error: function(jqXHR, textStatus, errorThrown) {
							//TODO
						}
					});
				}

				function updateStatusIcon(status, fn)
				{
					if (!status) {
						$('#form-status').fadeOut(fn && typeof(fn) == 'function' ? fn : function() {});
					} else {
						$('#form-status span').hide();
						$('#form-status #' + status + '-status').show();
						$('#form-status').show();
					}
				}

				function setAction(_action)
				{
					action = _action;
				}

				function getAction() {
					return action;
				}

				return {
					save: save,
					setAction: setAction,
					getAction: getAction
				};
			}

		},
		cloneTextarea: function(textarea,wrapper,editor)
		{
			var id = "editor_container_"+editor;
			$(wrapper).append(textarea.clone(true).attr({'id':id,'name':'text_'+editor,'disabled':true}));
			textarea.hide();
			return id;
		},
		cut_hr: '<span class="b-elrte-wa-split-vertical" id="elrte-wa_split_vertical">%text%</span>',
		cut_str: '<!-- more %text%-->',
		htmlToWysiwyg: function(text) {
			return text.replace(/<!--[\s]*?more[\s]*?(text[\s]*?=[\s]*?['"]([\s\S]*?)['"])*[\s]*?-->/g, function(cut_str, p1, p2) {
				return p2 ? $.wa_blog.editor.cut_hr.replace('%text%', p2) : $.wa_blog.editor.cut_hr.replace('%text%', $.wa_blog.editor.options.cut_link_label_defaul);
			});
		},
		wysiwygToHtml: function(text) {
			return text.replace(/<span[\s\S]*?id=['"]elrte-wa_split_vertical['"][\s\S]*?>([\s\S]*?)<\/span>/g, function(cut_hr, p1) {
				if (!p1 || p1 == '<br>' || p1 == $.wa_blog.editor.options.cut_link_label_defaul) {
					return $.wa_blog.editor.cut_str.replace('%text%', '');
				} else {
					return $.wa_blog.editor.cut_str.replace('%text%', 'text="' + p1 + '" ');
				}
			});
		},
		editors : {
			codemirror : {
				editor:null,
				inited: false,
				init : function(textarea) {
					if(!this.inited) {

						this.inited = true;
						var options = $.wa_blog.editor.options;
						var container = $.wa_blog.editor.cloneTextarea(textarea,'#' + options['content_id']+'_wrapper','codemirror');
						var height = $.wa_blog.editor.calcEditorHeight();

						this.editor = CodeMirror.fromTextArea(
								document.getElementById(container), {
									mode: "text/html",
									tabMode: "indent",
									height: "dynamic",
									lineWrapping: true,
									minHeight : height,
									initCallback: function (editor) {
										setTimeout(function() {
											try{
												editor.frame.contentWindow.document.addEventListener('keydown', $.wa_blog.editor.editorKeyCallback(), false);
												editor.frame.contentWindow.document.addEventListener('keypress', $.wa_blog.editor.editorKeyCallback(true), false);
											} catch(e) {
												$.wa_blog.editor.log('Exception: '+e.message + '\nline: '+e.fileName+':'+e.lineNumber);
											}
										},100);
									}
								}
						);
						$('#post_text_wrapper .CodeMirror-scroll').height(this.correctEditorHeight(height));
					}

					return true;
				},
				show: function(textarea) {
					$('.CodeMirror').show();
					var self = this;
					setTimeout(function() {
						if(self.editor/* && self.editor.editor*/) {
							var text = $.wa_blog.editor.wysiwygToHtml(textarea.val());
							self.editor.setValue(text);
							self.editor.refresh();
						} else {
							if(typeof(console) == 'object') {
								console.log('wait for codemirror editor init');
							}
							self.show(textarea);
						}
					},100);

				},
				hide: function() {
					$('.CodeMirror').hide();
				},
				update : function(textarea) {
					if(this.inited) {
						textarea.val(this.editor.getValue());
					}
				},
				correctEditorHeight: function(height) {
					return Math.max(height, $.wa_blog.editor.getMinEditorHeight()) + $.wa_blog.editor.getExtHeightShift();
				}
			},
			elrte : {
				options: {},
				inited:false,
				callback:false,
				init : function(textarea) {
					if(!this.inited) {
						var options = $.wa_blog.editor.options;
						elRTE.prototype.options.lang = wa_lang;
						elRTE.prototype.options.wa_image_upload = '?module=post&action=image';
						elRTE.prototype.options.wa_image_upload_path = wa_img_upload_path;
						elRTE.prototype.beforeSave = function () {};
						elRTE.prototype.options.toolbars.blogToolbar = ['wa_style', 'alignment', 'colors', 'format', 'indent', 'lists', 'wa_image', 'wa_links', 'wa_elements', 'wa_tables', 'direction', 'wa_split_vertical'];

						this.inited = $.wa_blog.editor.cloneTextarea(textarea,'#' + options['content_id']+'_wrapper','elrte');
						var height = $.wa_blog.editor.calcEditorHeight();

						$('#'+this.inited).elrte({
							height: height,
							cssfiles: [wa_url + "wa-content/css/wa/wa-1.0.css?v"+$.wa_blog.editor.options.version, wa_url + "wa-apps/blog/css/blog.css?v"+$.wa_blog.editor.options.version],
							toolbar: 'blogToolbar',
							lang: wa_lang,
							width: "100%"
						});
						$('.workzone, iframe', '#post_text_wrapper').height(this.correctEditorHeight(height));

					}
					return true;
				},
				show: function(textarea) {
					var text = $.wa_blog.editor.htmlToWysiwyg(textarea.val());
					$('#'+this.inited).elrte('val', text);
					$(".el-rte").css({'width':'100%'}).show();

					if(!this.callback) {
						$('.el-rte iframe').contents()
						.keydown($.wa_blog.editor.editorKeyCallback())
						.keypress($.wa_blog.editor.editorKeyCallback(true))
						.keyup(function(e) {
							//all dialogs should be closed when Escape is pressed
							if (e.keyCode == 27) {
								$(".dialog:visible").trigger('esc');
							}
						});
						this.callback = true;
					}
					$('.el-rte iframe').contents().find('body').focus();
				},
				hide: function() {
					$(".el-rte").hide();
				},
				update : function(textarea) {
					if(this.inited) {
						textarea.val($('#editor_container_elrte').elrte('val'));
					}
				},
				correctEditorHeight: function(height) {
					var decrease = 0;
					$('#post_text_wrapper .el-rte').children('div:not(:hidden)').each(function() {
						if (this.className != 'workzone') {
							decrease += $(this).outerHeight(true);
						}
					});

					return Math.max(height, $.wa_blog.editor.getMinEditorHeight()) - decrease + $.wa_blog.editor.getExtHeightShift();
				}
			}
		},
		getMinEditorHeight: function() {
			return 200;
		},
		getExtHeightShift: function() {
			return -70;
		},
		calcEditorHeight: function() {
			var viewedAreaHeight = $(document.documentElement).height();
			var editorAreaHeightOffset = $('#post-editor').offset();
			var buttonsBarHeight = $('#buttons-bar').outerHeight(true);
			return height = viewedAreaHeight - editorAreaHeightOffset.top - buttonsBarHeight;
		},
		editorTooggle : function() {

			if (!$(this).hasClass('selected')
					&& $.wa_blog.editor.selectEditor($(this).attr('id'))) {
				$('.b-post-editor-toggle li.selected').removeClass('selected');
				$(this).parent().addClass('selected');
			}
			return false;
		},
		selectEditor : function(id, external) {

			if (this.editors[id]) {
				var textarea = $("#" + this.options['content_id']);
				if(textarea.length) {
					try {
						if(this.editors[id].init(textarea)) {
							var current_id = null;
							if (!external) {
								try {
									$.storage.set('blog/editor', id);
								} catch(e) {
									this.log('Exception: '+e.message + '\nline: '+e.fileName+':'+e.lineNumber);
								}
							}
							var current_item = $('.b-post-editor-toggle li.selected a');

							if(current_item.length) {
								current_item.removeClass('selected');
								if(current_id = current_item.attr('id')) {
									this.editors[current_id].update(textarea);
									this.editors[current_id].hide();
								}
							}

							$('#' + id).parent().addClass('selected');
							this.editors[id].show(textarea);
						}
					} catch(e) {
						this.log('Exception: '+e.message + '\nline: '+e.fileName+':'+e.lineNumber);
						return false;
					}

					return true;
				} else {
					this.log('Text container for "' + id + '" not found');
					return false;
				}
			} else {
				this.log('Blog editor "' + id + '" not found');
				return false;
			}
		},
		editor_key: false,
		editorKeyCallback: function (press) {
			var self = this;

			if (press) {	// when keypress
				return function (e) {
					// ctrl + s
					if (e.ctrlKey && e.which == 115 && !$.wa_blog.editor.editor_key) {
						self.onSaveHotkey(e);
					}
				};
			} else {	// when keydown
				return function (e) {
					// ctrl + s
					$.wa_blog.editor.editor_key = false;
					if (e.ctrlKey && e.which == 83) {
						$.wa_blog.editor.editor_key = true;
						self.onSaveHotkey(e);
					}
					if (e.metaKey) {
						return;
					}
					if (
						(e.which < 33 || e.which > 40) &&
						(e.which > 27 || e.which == 8 || e.which == 13) &&
						(e.which < 112 || e.which > 124) &&
						(!e.ctrlKey || e.which != 67)
					)
					{
						$('#b-post-save-button').removeClass('green').addClass('yellow');
						$('#postpublish-edit').removeClass('green').addClass('yellow');
					}
				};
			}
		},
		onSubmit: function() {

			var blog = $.wa_blog;
			for (var i in blog) {
				if (i != 'editor') {
					if (blog[i].onSubmit && (typeof(blog[i].onSubmit) == 'function')) {
						try {
							blog[i].onSubmit();
						} catch (e) {
							if (typeof(console) == 'object') {
								console.log(e);
							}
						}
					}
				}
			}

			var textarea = $("#" + this.options['content_id']);

			if(textarea.length) {
				var current_id = null;
				var current_item = $('.b-post-editor-toggle li.selected a');
				if(current_item.length && (current_id = current_item.attr('id')) ) {
					this.editors[current_id].update(textarea);
				}
			}

			var button = $('#b-post-save-button');
			var color_class = 'green';

			if ((button.attr('name') == 'draft') || (button.attr('name') == 'deadline')) {
				color_class = 'grey';
			} else {
				button.removeClass('yellow').addClass(color_class);
				$('#postpublish-edit').removeClass('yellow').addClass(color_class);
			}
		},
		onSaveHotkey: function(e)
		{
			e.preventDefault();

			var draftButton = $('#b-post-save-draft-button');
			var saveButton = $('#b-post-save-button');

			if (draftButton.length) {
				draftButton.click();
			} else if (saveButton.length) {
				saveButton.click();
			}
		},
		currentDialog: null,
		closeCurrentDialog: function()
		{
			if (this.currentDialog) {
				this.currentDialog.waDialog().trigger('close');
			}
		},
		registerEditor : function(id, callback) {
			if (this.editors[id]) {
				this.log('Editor "' + id + '" already registered');
				return false;
			} else {
				this.editors[id] = callback;
				return true;
			}
		},
		log : function(message) {
			if (typeof(console) == 'object') {
				console.log(message);
			}
		},
		changeBlogHandler: function() {
			var id = parseInt($(this).attr('href').replace(/^.*#/,''));
			if($.wa_blog.editor.selectCurrentBlog(id)) {
				$('.dialog :input:checked').attr('checked',false);
				$('.dialog #b-post-publish-blog-'+id).attr('checked',true);
			}
			$.wa.dropdownsClose();
			return false;
		},
		changePublishBlogHandler: function() {
			if($(this).attr('checked')) {
				var id = parseInt($(this).val());
				$.wa_blog.editor.selectCurrentBlog(id);
			}
		},
		selectCurrentBlog: function(id)
		{
			var blog = $.wa_blog.editor.options.blogs[id];
			var prev_id = $.wa_blog.editor.options.current_blog_id;
			if(blog && (prev_id != id)) {
				var current_blog = $.tmpl('selected-blog',{'blog':blog});

				$('.current-blog').replaceWith(current_blog);
				$('#blog-selector-'+prev_id).removeClass('selected');
				var blog_selector = $('#blog-selector-'+id).addClass('selected')

				var prev_blog = $.wa_blog.editor.options.blogs[prev_id];
				$.wa_blog.editor.options.current_blog_id = parseInt(id);
				var post = $('.b-post');
				if(prev_blog) {
					post.removeClass(prev_blog.color);
				}
				post.addClass(blog.color);

				$.wa_blog.editor.postUrlWidget.changeBlog(blog_selector.attr('data-blog-status'));
				return true;
			}
		}

	};

})(jQuery);

;
/* Russian (UTF-8) initialisation for the jQuery UI date picker plugin. */
/* Written by Andrew Stromnov (stromnov@gmail.com). */
jQuery(function($){
	$.datepicker.regional['ru'] = {
		closeText: 'Закрыть',
		prevText: '&#x3c;Пред',
		nextText: 'След&#x3e;',
		currentText: 'Сегодня',
		monthNames: ['Январь','Февраль','Март','Апрель','Май','Июнь',
		'Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'],
		monthNamesShort: ['Янв','Фев','Мар','Апр','Май','Июн',
		'Июл','Авг','Сен','Окт','Ноя','Дек'],
		dayNames: ['воскресенье','понедельник','вторник','среда','четверг','пятница','суббота'],
		dayNamesShort: ['вск','пнд','втр','срд','чтв','птн','сбт'],
		dayNamesMin: ['Вс','Пн','Вт','Ср','Чт','Пт','Сб'],
		weekHeader: 'Нед',
		dateFormat: 'dd.mm.yy',
		firstDay: 1,
		isRTL: false,
		showMonthAfterYear: false,
		yearSuffix: ''};
	$.datepicker.setDefaults($.datepicker.regional['ru']);
});;
var CodeMirror=function(){function B(b,e){function i(a){return a>=0&&a<t.size}function h(a){var c=t;for(a=a;!c.lines;)for(var d=0;;++d){var f=c.children[d],g=f.chunkSize();if(a<g){c=f;break}a-=g}return c.lines[a]}function k(a,c){ja=true;for(var d=c-a.height,f=a;f;f=f.parent)f.height+=d}function p(a){var c={line:0,ch:0};pa(c,{line:t.size-1,ch:h(t.size-1).text.length},Wa(a),c,c);wa=true}function q(a){if(!(n.onDragEvent&&n.onDragEvent(H,Xa(a)))){a.preventDefault();var c=Qa(a,true),d=a.dataTransfer.files;
if(!(!c||n.readOnly))if(d&&d.length&&window.FileReader&&window.File){a=function(r,s){var v=new FileReader;v.onload=function(){g[s]=v.result;if(++j==f){c=I(c);x(function(){var u=N(g.join(""),c,c);xa(c,u)})()}};v.readAsText(r)};for(var f=d.length,g=Array(f),j=0,l=0;l<f;++l)a(d[l],l)}else try{(g=a.dataTransfer.getData("Text"))&&sc(function(){var r=m.from,s=m.to;xa(c,c);Mb&&N("",r,s);Q(g);J()})}catch(o){}}}function y(a){var c=ka();a.dataTransfer.setData("Text",c);if(Ya||tc){c=document.createElement("img");
c.scr="data:image/gif;base64,R0lGODdhAgACAIAAAAAAAP///ywAAAAAAgACAAACAoRRADs=";a.dataTransfer.setDragImage(c,0,0)}}function G(a,c){if(typeof a=="string"){a=uc[a];if(!a)return false}var d=da;try{if(n.readOnly)pb=true;if(c)da=null;a(H)}catch(f){if(f!=vc)throw f;return false}finally{da=d;pb=false}return true}function aa(a){function c(){l=true}var d=Nb(n.keyMap),f=d.auto;clearTimeout(wc);if(f&&!Yc(a))wc=setTimeout(function(){if(Nb(n.keyMap)==d)n.keyMap=f.call?f.call(null,H):f},50);var g=Ja[X(a,"keyCode")],
j=false;if(g==null||a.altGraphKey)return false;if(X(a,"altKey"))g="Alt-"+g;if(X(a,"ctrlKey"))g="Ctrl-"+g;if(X(a,"metaKey"))g="Cmd-"+g;var l=false;j=X(a,"shiftKey")?qb("Shift-"+g,n.extraKeys,n.keyMap,function(o){return G(o,true)},c)||qb(g,n.extraKeys,n.keyMap,function(o){if(typeof o=="string"&&/^go[A-Z]/.test(o))return G(o)},c):qb(g,n.extraKeys,n.keyMap,G,c);if(l)j=false;if(j){R(a);rb();if(Ka){a.oldKeyCode=a.keyCode;a.keyCode=0}}return j}function ba(a,c){var d=qb("'"+c+"'",n.extraKeys,n.keyMap,function(f){return G(f,
true)});if(d){R(a);rb()}return d}function Za(a){ea||S();if(Ka&&a.keyCode==27)a.returnValue=false;if(Ra)if(ya())Ra=false;if(!(n.onKeyEvent&&n.onKeyEvent(H,Xa(a)))){var c=X(a,"keyCode");xc(c==16||X(a,"shiftKey"));var d=aa(a);if(window.opera){Ob=d?c:null;if(!d&&c==88&&X(a,Pb?"metaKey":"ctrlKey"))Q("")}}}function S(){if(n.readOnly!="nocursor"){if(!ea){n.onFocus&&n.onFocus(H);ea=true;if(K.className.search(/\bCodeMirror-focused\b/)==-1)K.className+=" CodeMirror-focused";$a||A(true)}za();rb()}}function fa(){if(ea){n.onBlur&&
n.onBlur(H);ea=false;Aa&&x(function(){if(Aa){Aa();Aa=null}})();K.className=K.className.replace(" CodeMirror-focused","")}clearInterval(Qb);setTimeout(function(){ea||(da=null)},150)}function pa(a,c,d,f,g){if(!pb){if(Y){var j=[];t.iter(a.line,c.line+1,function(l){j.push(l.text)});for(Y.addChange(a.line,d.length,j);Y.done.length>n.undoDepth;)Y.done.shift()}qa(a,c,d,f,g)}}function T(a,c){if(a.length){for(var d=a.pop(),f=[],g=d.length-1;g>=0;g-=1){var j=d[g],l=[],o=j.start+j.added;t.iter(j.start,o,function(s){l.push(s.text)});
f.push({start:j.start,added:j.old.length,old:l});var r=I({line:j.start+j.old.length-1,ch:Zc(l[l.length-1],j.old[j.old.length-1])});qa({line:j.start,ch:0},{line:o-1,ch:h(o-1).text.length},j.old,r,r)}wa=true;c.push(f)}}function qa(a,c,d,f,g){if(!pb){var j=false,l=ga.length;n.lineWrapping||t.iter(a.line,c.line+1,function(F){if(!F.hidden&&F.text.length==l)return j=true});if(a.line!=c.line||d.length>1)ja=true;var o=c.line-a.line,r=h(a.line),s=h(c.line);if(a.ch==0&&c.ch==0&&d[d.length-1]==""){var v=[];
r=null;if(a.line){r=h(a.line-1);r.fixMarkEnds(s)}else s.fixMarkStarts();for(var u=0,z=d.length-1;u<z;++u)v.push(Ba.inheritMarks(d[u],r));o&&t.remove(a.line,o,ab);v.length&&t.insert(a.line,v)}else if(r==s)if(d.length==1)r.replace(a.ch,c.ch,d[0]);else{s=r.split(c.ch,d[d.length-1]);r.replace(a.ch,null,d[0]);r.fixMarkEnds(s);v=[];u=1;for(z=d.length-1;u<z;++u)v.push(Ba.inheritMarks(d[u],r));v.push(s);t.insert(a.line+1,v)}else if(d.length==1){r.replace(a.ch,null,d[0]);s.replace(null,c.ch,"");r.append(s);
t.remove(a.line+1,o,ab)}else{v=[];r.replace(a.ch,null,d[0]);s.replace(null,c.ch,d[d.length-1]);r.fixMarkEnds(s);u=1;for(z=d.length-1;u<z;++u)v.push(Ba.inheritMarks(d[u],r));o>1&&t.remove(a.line+1,o-1,ab);t.insert(a.line+1,v)}if(n.lineWrapping){var O=Math.max(5,w.clientWidth/Rb()-3);t.iter(a.line,a.line+d.length,function(F){if(!F.hidden){var Ca=Math.ceil(F.text.length/O)||1;Ca!=F.height&&k(F,Ca)}})}else{t.iter(a.line,a.line+d.length,function(F){var Ca=F.text;if(!F.hidden&&Ca.length>l){ga=Ca;l=Ca.length;
ra=null;j=false}});if(j)bb=true}s=[];o=d.length-o-1;u=0;for(v=la.length;u<v;++u){z=la[u];if(z<a.line)s.push(z);else z>c.line&&s.push(z+o)}u=a.line+Math.min(d.length,500);$c(a.line,u);s.push(u);la=s;Sb(100);ha.push({from:a.line,to:c.line+1,diff:o});a={from:a,to:c,text:d};if(cb){for(d=cb;d.next;d=d.next);d.next=a}else cb=a;db(f,g,m.from.line<=Math.min(c.line,c.line+o)?m.from.line:m.from.line+o,m.to.line<=Math.min(c.line,c.line+o)?m.to.line:m.to.line+o);if(w.clientHeight)U.style.height=t.height*Da()+
2*C.offsetTop+"px"}}function eb(){var a=0;ga="";ra=null;t.iter(0,t.size,function(c){var d=c.text;if(!c.hidden&&d.length>a){a=d.length;ga=d}});bb=false}function N(a,c,d){function f(j){if(ma(j,c))return j;if(!ma(d,j))return g;var l=j.line+a.length-(d.line-c.line)-1,o=j.ch;if(j.line==d.line)o+=a[a.length-1].length-(d.ch-(d.line==c.line?c.ch:0));return{line:l,ch:o}}c=I(c);d=d?I(d):c;a=Wa(a);var g;Ea(a,c,d,function(j){g=j;return{from:f(m.from),to:f(m.to)}});return g}function Q(a,c){Ea(Wa(a),m.from,m.to,
function(d){return c=="end"?{from:d,to:d}:c=="start"?{from:m.from,to:m.from}:{from:m.from,to:d}})}function Ea(a,c,d,f){f=f({line:c.line+a.length-1,ch:a.length==1?a[0].length+c.ch:a[a.length-1].length});pa(c,d,a,f.from,f.to)}function sa(a,c){var d=a.line,f=c.line;if(d==f)return h(d).text.slice(a.ch,c.ch);var g=[h(d).text.slice(a.ch)];t.iter(d+1,f,function(j){g.push(j.text)});g.push(h(f).text.slice(0,c.ch));return g.join("\n")}function ka(){return sa(m.from,m.to)}function za(){Ra||Tb.set(n.pollInterval,
function(){Ub();ya();ea&&za();Vb()})}function na(){function a(){Ub();if(!ya()&&!c){c=true;Tb.set(60,a)}else{Ra=false;za()}Vb()}var c=false;Ra=true;Tb.set(20,a)}function ya(){if($a||!ea||ad(D)||n.readOnly)return false;var a=D.value;if(a==ta)return false;da=null;for(var c=0,d=Math.min(ta.length,a.length);c<d&&ta[c]==a[c];)++c;if(c<ta.length)m.from={line:m.from.line,ch:m.from.ch-(ta.length-c)};else if(sb&&L(m.from,m.to))m.to={line:m.to.line,ch:Math.min(h(m.to.line).text.length,m.to.ch+(a.length-c))};
Q(a.slice(c),"end");if(a.length>1E3)D.value=ta="";else ta=a;return true}function A(a){if(L(m.from,m.to)){if(a)ta=D.value=""}else{ta="";D.value=ka();yc(D)}}function J(){n.readOnly!="nocursor"&&D.focus()}function ia(){if(Z.getBoundingClientRect){var a=Z.getBoundingClientRect();if(!(Ka&&a.top==a.bottom)){var c=window.innerHeight||Math.max(document.body.offsetHeight,document.documentElement.offsetHeight);if(a.top<0||a.bottom>c)Z.scrollIntoView()}}}function W(){var a=ua(m.inverted?m.from:m.to),c=n.lineWrapping?
Math.min(a.x,C.offsetWidth):a.x;return La(c,a.y,c,a.yBot)}function La(a,c,d,f){var g=C.offsetLeft,j=C.offsetTop;c+=j;f+=j;a+=g;d+=g;var l=w.clientHeight,o=w.scrollTop;j=false;var r=true;if(c<o){w.scrollTop=Math.max(0,c);j=true}else if(f>o+l){w.scrollTop=f-l;j=true}c=w.clientWidth;f=w.scrollLeft;l=n.fixedGutter?V.clientWidth:0;g=a<l+g+10;if(a<f+l||g){if(g)a=0;w.scrollLeft=Math.max(0,a-10-l);j=true}else if(d>c+f-3){w.scrollLeft=d+10-c;j=true;if(d>U.clientWidth)r=false}j&&n.onScroll&&n.onScroll(H);return r}
function fb(){var a=Da(),c=w.scrollTop-C.offsetTop,d=Math.ceil((c+w.clientHeight)/a);return{from:Wb(t,Math.max(0,Math.floor(c/a))),to:Wb(t,d)}}function Ma(a,c){function d(){ra=w.clientWidth;var v=ca.firstChild,u=false;t.iter(P,$,function(z){if(!z.hidden){var O=Math.round(v.offsetHeight/s)||1;if(z.height!=O){k(z,O);ja=u=true}}v=v.nextSibling});if(u)U.style.height=t.height*s+2*C.offsetTop+"px";return u}if(w.clientWidth){var f=fb();if(!(a!==true&&a.length==0&&f.from>P&&f.to<$)){var g=Math.max(f.from-
100,0);f=Math.min(t.size,f.to+100);if(P<g&&g-P<20)g=P;if($>f&&$-f<20)f=Math.min(t.size,$);for(var j=a===true?[]:bd([{from:P,to:$,domStart:0}],a),l=0,o=0;o<j.length;++o){var r=j[o];if(r.from<g){r.domStart+=g-r.from;r.from=g}if(r.to>f)r.to=f;if(r.from>=r.to)j.splice(o--,1);else l+=r.to-r.from}if(!(l==f-g&&g==P&&f==$)){j.sort(function(v,u){return v.domStart-u.domStart});var s=Da();l=V.style.display;ca.style.display="none";cd(g,f,j);ca.style.display=V.style.display="";if(o=g!=P||f!=$||zc!=w.clientHeight+
s)zc=w.clientHeight+s;P=g;$=f;gb=Xb(t,g);tb.style.top=gb*s+"px";if(w.clientHeight)U.style.height=t.height*s+2*C.offsetTop+"px";if(ca.childNodes.length!=$-P)throw Error("BAD PATCH! "+JSON.stringify(j)+" size="+($-P)+" nodes="+ca.childNodes.length);if(n.lineWrapping)d();else{if(ra==null)ra=Yb(ga);if(ra>w.clientWidth){C.style.width=ra+"px";U.style.width="";U.style.width=w.scrollWidth+"px"}else C.style.width=U.style.width=""}V.style.display=l;if(o||ja)Zb()&&n.lineWrapping&&d()&&Zb();Ac();!c&&n.onUpdate&&
n.onUpdate(H);return true}}}else P=$=gb=0}function bd(a,c){for(var d=0,f=c.length||0;d<f;++d){for(var g=c[d],j=[],l=g.diff||0,o=0,r=a.length;o<r;++o){var s=a[o];if(g.to<=s.from&&g.diff)j.push({from:s.from+l,to:s.to+l,domStart:s.domStart});else if(g.to<=s.from||g.from>=s.to)j.push(s);else{g.from>s.from&&j.push({from:s.from,to:g.from,domStart:s.domStart});g.to<s.to&&j.push({from:g.to+l,to:s.to+l,domStart:s.domStart+(g.to-s.from)})}}a=j}return a}function cd(a,c,d){if(d.length){for(var f=function(u){var z=
u.nextSibling;u.parentNode.removeChild(u);return z},g=0,j=ca.firstChild,l=0;l<d.length;++l){for(var o=d[l];o.domStart>g;){j=f(j);g++}var r=0;for(o=o.to-o.from;r<o;++r){j=j.nextSibling;g++}}for(;j;)j=f(j)}else ca.innerHTML="";var s=d.shift();j=ca.firstChild;r=a;var v=document.createElement("div");t.iter(a,c,function(u){if(s&&s.to==r)s=d.shift();if(!s||s.from>r){if(u.hidden)var z=v.innerHTML="<pre></pre>";else{z="<pre"+(u.className?' class="'+u.className+'"':"")+">"+u.getHTML(Bc)+"</pre>";if(u.bgClassName)z=
'<div style="position: relative"><pre class="'+u.bgClassName+'" style="position: absolute; left: 0; right: 0; top: 0; bottom: 0; z-index: -2">&#160;</pre>'+z+"</div>"}v.innerHTML=z;ca.insertBefore(v.firstChild,j)}else j=j.nextSibling;++r})}function Zb(){if(n.gutter||n.lineNumbers){var a=tb.offsetHeight,c=w.clientHeight;V.style.height=(a-c<2?c:a)+"px";var d=[],f=P,g;t.iter(P,Math.max($,P+1),function(o){if(o.hidden)d.push("<pre></pre>");else{var r=o.gutterMarker,s=n.lineNumbers?f+n.firstLineNumber:
null;if(r&&r.text)s=r.text.replace("%N%",s!=null?s:"");else if(s==null)s="\u00a0";d.push(r&&r.style?'<pre class="'+r.style+'">':"<pre>",s);for(s=1;s<o.height;++s)d.push("<br/>&#160;");d.push("</pre>");r||(g=f)}++f});V.style.display="none";hb.innerHTML=d.join("");if(g!=null){a=hb.childNodes[g-P];c=String(t.size).length;for(var j=a.textContent||a.innerText||a.nodeValue||"",l="";j.length+l.length<c;)l+="\u00a0";l&&a.insertBefore(document.createTextNode(l),a.firstChild)}V.style.display="";a=Math.abs((parseInt(C.style.marginLeft)||
0)-V.offsetWidth)>2;C.style.marginLeft=V.offsetWidth+"px";ja=false;return a}}function Ac(){var a=L(m.from,m.to),c=ua(m.from,true),d=a?c:ua(m.to,true),f=m.inverted?c:d,g=Da(),j=Na(K),l=Na(ca);Oa.style.top=Math.max(0,Math.min(w.offsetHeight,f.y+l.top-j.top))+"px";Oa.style.left=Math.max(0,Math.min(w.offsetWidth,f.x+l.left-j.left))+"px";if(a){Z.style.top=f.y+"px";Z.style.left=(n.lineWrapping?Math.min(f.x,C.offsetWidth):f.x)+"px";Z.style.display="";ub.style.display="none"}else{a=c.y==d.y;var o="",r=C.clientWidth||
C.offsetWidth;f=C.clientHeight||C.offsetHeight;j=function(s,v,u,z){o+='<div class="CodeMirror-selected" style="position: absolute; left: '+s+"px; top: "+v+"px; "+(dd?"width: "+(!u?r:r-u-s)+"px":"right: "+u+"px")+"; height: "+z+'px"></div>'};if(m.from.ch&&c.y>=0)j(c.x,c.y,a?r-d.x:0,g);c=Math.max(0,c.y+(m.from.ch?g:0));l=Math.min(d.y,f)-c;l>0.2*g&&j(0,c,0,l);if((!a||!m.from.ch)&&d.y<f-0.5*g)j(0,d.y,r-d.x,g);ub.innerHTML=o;Z.style.display="none";ub.style.display=""}}function xc(a){da=a?da||(m.inverted?
m.to:m.from):null}function xa(a,c){var d=da&&I(da);if(d)if(ma(d,a))a=d;else if(ma(c,d))c=d;db(a,c);vb=true}function db(a,c,d,f){wb=null;if(d==null){d=m.from.line;f=m.to.line}if(!(L(m.from,a)&&L(m.to,c))){if(ma(c,a)){var g=c;c=a;a=g}if(a.line!=d)if(d=xb(a,d,m.from.ch))a=d;else $b(a.line,false);if(c.line!=f)c=xb(c,f,m.to.ch);if(L(a,c))m.inverted=false;else if(L(a,m.to))m.inverted=false;else if(L(c,m.from))m.inverted=true;if(n.autoClearEmptyLines&&L(m.from,m.to))if((m.inverted?a:c).line!=m.from.line&&
m.from.line<t.size){var j=h(m.from.line);/^\s+$/.test(j.text)&&setTimeout(x(function(){if(j.parent&&/^\s+$/.test(j.text)){var l=Sa(j);N("",{line:l,ch:0},{line:l,ch:j.text.length})}},10))}m.from=a;m.to=c;Fa=true}}function xb(a,c,d){function f(l){for(var o=a.line+l,r=l==1?t.size:-1;o!=r;){var s=h(o);if(!s.hidden){l=a.ch;if(j||l>d||l>s.text.length)l=s.text.length;return{line:o,ch:l}}o+=l}}var g=h(a.line),j=a.ch==g.text.length&&a.ch!=d;if(!g.hidden)return a;return a.line>=c?f(1)||f(-1):f(-1)||f(1)}function Ga(a,
c,d){a=I({line:a,ch:c||0});(d?xa:db)(a,a)}function yb(a){return Math.max(0,Math.min(a,t.size-1))}function I(a){if(a.line<0)return{line:0,ch:0};if(a.line>=t.size)return{line:t.size-1,ch:h(t.size-1).text.length};var c=a.ch,d=h(a.line).text.length;return c==null||c>d?{line:a.line,ch:d}:c<0?{line:a.line,ch:0}:a}function ac(a,c){function d(o){if(j==(a<0?0:l.text.length)){if(o=!o)a:{o=g+a;for(var r=a<0?-1:t.size;o!=r;o+=a){var s=h(o);if(!s.hidden){g=o;l=s;o=true;break a}}o=void 0}if(o)j=a<0?l.text.length:
0;else return false}else j+=a;return true}var f=m.inverted?m.from:m.to,g=f.line,j=f.ch,l=h(g);if(c=="char")d();else if(c=="column")d(true);else if(c=="word")for(f=false;;){if(a<0)if(!d())break;if(bc(l.text.charAt(j)))f=true;else if(f){if(a<0){a=1;d()}break}if(a>0)if(!d())break}return{line:g,ch:j}}function Cc(a){for(var c=h(a.line).text,d=a.ch,f=a.ch;d>0&&bc(c.charAt(d-1));)--d;for(;f<c.length&&bc(c.charAt(f));)++f;xa({line:a.line,ch:d},{line:a.line,ch:f})}function ed(a){xa({line:a,ch:0},I({line:a+
1,ch:0}))}function zb(a,c){c||(c="add");if(c=="smart")if(M.indent)var d=Ab(a);else c="prev";var f=h(a),g=f.indentation(n.tabSize),j=f.text.match(/^\s*/)[0],l;if(c=="prev")l=a?h(a-1).indentation(n.tabSize):0;else if(c=="smart")l=M.indent(d,f.text.slice(j.length),f.text);else if(c=="add")l=g+n.indentUnit;else if(c=="subtract")l=g-n.indentUnit;l=Math.max(0,l);if(l-g){g="";d=0;if(n.indentWithTabs)for(f=Math.floor(l/n.tabSize);f;--f){d+=n.tabSize;g+="\t"}for(;d<l;){++d;g+=" "}}else{if(m.from.line!=a&&
m.to.line!=a)return;g=j}N(g,{line:a,ch:0},{line:a,ch:j.length})}function Dc(){M=B.getMode(n,n.mode);t.iter(0,t.size,function(a){a.stateAfter=null});la=[0];Sb()}function fd(){if(n.lineWrapping){K.className+=" CodeMirror-wrap";var a=w.clientWidth/Rb()-3;t.iter(0,t.size,function(c){if(!c.hidden){var d=Math.ceil(c.text.length/a)||1;d!=1&&k(c,d)}});C.style.width=U.style.width=""}else{K.className=K.className.replace(" CodeMirror-wrap","");ra=null;ga="";t.iter(0,t.size,function(c){c.height!=1&&!c.hidden&&
k(c,1);if(c.text.length>ga.length)ga=c.text})}ha.push({from:0,to:t.size})}function Bc(a){a=n.tabSize-a%n.tabSize;var c=Ec[a];if(c)return c;c='<span class="cm-tab">';for(var d=0;d<a;++d)c+=" ";return Ec[a]={html:c+"</span>",width:a}}function Fc(){w.className=w.className.replace(/\s*cm-s-\S+/g,"")+n.theme.replace(/(^|\s)\s*/g," cm-s-")}function Gc(){var a=va[n.keyMap].style;K.className=K.className.replace(/\s*cm-keymap-\S+/g,"")+(a?" cm-keymap-"+a:"")}function cc(){this.set=[]}function dc(a,c,d){function f(o,
r,s,v){h(o).addMark(new Bb(r,s,v,g))}a=I(a);c=I(c);var g=new cc;if(!ma(a,c))return g;if(a.line==c.line)f(a.line,a.ch,c.ch,d);else{f(a.line,a.ch,null,d);for(var j=a.line+1,l=c.line;j<l;++j)f(j,null,null,d);f(c.line,null,c.ch,d)}ha.push({from:a.line,to:c.line+1});return g}function Hc(a,c){var d=a,f=a;if(typeof a=="number")f=h(yb(a));else d=Sa(a);if(d==null)return null;if(c(f,d))ha.push({from:d,to:d+1});else return null;return f}function $b(a,c){return Hc(a,function(d,f){if(d.hidden!=c){d.hidden=c;if(!n.lineWrapping){var g=
d.text;if(c&&g.length==ga.length)bb=true;else if(!c&&g.length>ga.length){ga=g;ra=null;bb=false}}k(d,c?0:1);var j=m.from.line;g=m.to.line;if(c&&(j==f||g==f)){j=j==f?xb({line:j,ch:0},j,0):m.from;g=g==f?xb({line:g,ch:0},g,0):m.to;if(!g)return;db(j,g)}return ja=true}})}function Yb(a){Ha.innerHTML="<pre><span>x</span></pre>";Ha.firstChild.firstChild.firstChild.nodeValue=a;return Ha.firstChild.firstChild.offsetWidth||10}function Ic(a,c){if(c==0)return{top:0,left:0};var d=n.lineWrapping&&c<a.text.length&&
Cb.test(a.text.slice(c-1,c+1));Ha.innerHTML="<pre>"+a.getHTML(Bc,c,Jc,d)+"</pre>";d=document.getElementById(Jc);var f=d.offsetTop,g=d.offsetLeft;if(Ka&&f==0&&g==0){f=document.createElement("span");f.innerHTML="x";d.parentNode.insertBefore(f,d.nextSibling);f=f.offsetTop}return{top:f,left:g}}function ua(a,c){var d,f=Da(),g=f*(Xb(t,a.line)-(c?gb:0));if(a.ch==0)d=0;else{var j=Ic(h(a.line),a.ch);d=j.left;if(n.lineWrapping)g+=Math.max(0,j.top)}return{x:d,y:g,yBot:g+f}}function ec(a,c){function d(F){F=Ic(o,
F);if(s)return Math.max(0,F.left+(Math.round(F.top/f)-v)*w.clientWidth);return F.left}if(c<0)c=0;var f=Da(),g=Rb(),j=gb+Math.floor(c/f),l=Wb(t,j);if(l>=t.size)return{line:t.size-1,ch:h(t.size-1).text.length};var o=h(l),r=o.text,s=n.lineWrapping,v=s?j-Xb(t,l):0;if(a<=0&&v==0)return{line:l,ch:0};var u=j=0;r=r.length;var z;for(g=Math.min(r,Math.ceil((a+v*w.clientWidth*0.9)/g));;){var O=d(g);if(O<=a&&g<r)g=Math.min(r,Math.ceil(g*1.2));else{z=O;r=g;break}}if(a>z)return{line:l,ch:r};g=Math.floor(r*0.8);
O=d(g);if(O<a){j=g;u=O}for(;;){if(r-j<=1)return{line:l,ch:z-a>a-u?j:r};g=Math.ceil((j+r)/2);O=d(g);if(O>a){r=g;z=O}else{j=g;u=O}}}function Da(){if(ib==null){ib="<pre>";for(var a=0;a<49;++a)ib+="x<br/>";ib+="x</pre>"}a=ca.clientHeight;if(a==Kc)return fc;Kc=a;Ha.innerHTML=ib;fc=Ha.firstChild.offsetHeight/50||1;Ha.innerHTML="";return fc}function Rb(){if(w.clientWidth==Lc)return Mc;Lc=w.clientWidth;return Mc=Yb("x")}function Qa(a,c){var d=Na(w,true),f,g;try{f=a.clientX;g=a.clientY}catch(j){return null}if(!c&&
(f-d.left>w.clientWidth||g-d.top>w.clientHeight))return null;d=Na(C,true);return ec(f-d.left,g-d.top)}function Nc(a){function c(){var o=Wa(D.value).join("\n");o!=j&&x(Q)(o,"end");Oa.style.position="relative";D.style.cssText=g;if(Oc)w.scrollTop=f;$a=false;A(true);za()}var d=Qa(a),f=w.scrollTop;if(!(!d||window.opera)){if(L(m.from,m.to)||ma(d,m.from)||!ma(d,m.to))x(Ga)(d.line,d.ch);var g=D.style.cssText;Oa.style.position="absolute";D.style.cssText="position: fixed; width: 30px; height: 30px; top: "+
(a.clientY-5)+"px; left: "+(a.clientX-5)+"px; z-index: 1000; background: white; border-width: 0; outline: none; overflow: hidden; opacity: .05; filter: alpha(opacity=5);";$a=true;var j=D.value=ka();J();yc(D);if(Ya){Db(a);var l=E(window,"mouseup",function(){l();setTimeout(c,20)},true)}else setTimeout(c,50)}}function rb(){clearInterval(Qb);var a=true;Z.style.visibility="";Qb=setInterval(function(){Z.style.visibility=(a=!a)?"":"hidden"},650)}function Pc(a){function c(oa,gd,hd){if(oa.text){var jb=oa.styles;
oa=l?0:oa.text.length-1;for(var gc,kb=l?0:jb.length-2,id=l?jb.length:-2;kb!=id;kb+=2*o){var Eb=jb[kb];if(jb[kb+1]!=null&&jb[kb+1]!=u)oa+=o*Eb.length;else for(var hc=l?0:Eb.length-1,jd=l?Eb.length:-1;hc!=jd;hc+=o,oa+=o)if(oa>=gd&&oa<hd&&O.test(gc=Eb.charAt(hc))){var Qc=ic[gc];if(Qc.charAt(1)==">"==l)z.push(gc);else if(z.pop()!=Qc.charAt(0))return{pos:oa,match:false};else if(!z.length)return{pos:oa,match:true}}}}}var d=m.inverted?m.from:m.to,f=h(d.line),g=d.ch-1,j=g>=0&&ic[f.text.charAt(g)]||ic[f.text.charAt(++g)];
if(j){j.charAt(0);var l=j.charAt(1)==">",o=l?1:-1,r=f.styles,s=g+1;j=0;for(var v=r.length;j<v;j+=2)if((s-=r[j].length)<=0){var u=r[j+1];break}var z=[f.text.charAt(g)],O=/[(){}[\]]/;j=d.line;for(v=l?Math.min(j+100,t.size):Math.max(-1,j-100);j!=v;j+=o){f=h(j);var F=j==d.line;if(F=c(f,F&&l?g+1:0,F&&!l?g:f.text.length))break}F||(F={pos:null,match:false});u=F.match?"CodeMirror-matchingbracket":"CodeMirror-nonmatchingbracket";var Ca=dc({line:d.line,ch:g},{line:d.line,ch:g+1},u),Rc=F.pos!=null&&dc({line:j,
ch:F.pos},{line:j,ch:F.pos+1},u);d=x(function(){Ca.clear();Rc&&Rc.clear()});if(a)setTimeout(d,800);else Aa=d}}function Sc(a){var c,d,f=a;for(a=a-40;f>a;--f){if(f==0)return 0;var g=h(f-1);if(g.stateAfter)return f;g=g.indentation(n.tabSize);if(d==null||c>g){d=f-1;c=g}}return d}function Ab(a){var c=Sc(a),d=c&&h(c-1).stateAfter;d=d?Ta(M,d):jc(M);t.iter(c,a,function(f){f.highlight(M,d,n.tabSize);f.stateAfter=Ta(M,d)});c<a&&ha.push({from:c,to:a});a<t.size&&!h(a).stateAfter&&la.push(a);return d}function $c(a,
c){var d=Ab(a);t.iter(a,c,function(f){f.highlight(M,d,n.tabSize);f.stateAfter=Ta(M,d)})}function kd(){for(var a=+new Date+n.workTime,c=la.length;la.length;){var d=h(P).stateAfter?la.pop():P;if(!(d>=t.size)){var f=Sc(d),g=f&&h(f-1).stateAfter;g=g?Ta(M,g):jc(M);var j=0,l=M.compareStates,o=false,r=f,s=false;t.iter(r,t.size,function(v){var u=v.stateAfter;if(+new Date>a){la.push(r);Sb(n.workDelay);o&&ha.push({from:d,to:r+1});return s=true}var z=v.highlight(M,g,n.tabSize);if(z)o=true;v.stateAfter=Ta(M,
g);v=null;if(l){var O=u&&l(u,g);if(O!=vc)v=!!O}if(v==null)if(z!==false||!u)j=0;else if(++j>3&&(!M.indent||M.indent(u,"")==M.indent(g,"")))v=true;if(v)return true;++r});if(s)return;o&&ha.push({from:d,to:r+1})}}c&&n.onHighlightComplete&&n.onHighlightComplete(H)}function Sb(a){la.length&&ld.set(a,x(kd))}function Ub(){wa=vb=cb=null;ha=[];Fa=false;ab=[]}function Vb(){var a=false,c;bb&&eb();if(Fa)a=!W();if(ha.length)c=Ma(ha,true);else{Fa&&Ac();ja&&Zb()}a&&W();if(Fa){ia();rb()}if(ea&&!$a&&(wa===true||wa!==
false&&Fa))A(vb);Fa&&n.matchBrackets&&setTimeout(x(function(){if(Aa){Aa();Aa=null}L(m.from,m.to)&&Pc(false)}),20);var d=cb;a=ab;Fa&&n.onCursorActivity&&n.onCursorActivity(H);d&&n.onChange&&H&&n.onChange(H,d);for(d=0;d<a.length;++d)a[d](H);c&&n.onUpdate&&n.onUpdate(H)}function x(a){return function(){Tc++||Ub();try{var c=a.apply(this,arguments)}finally{--Tc||Vb()}return c}}function sc(a){Y.startCompound();try{return a()}finally{Y.endCompound()}}var n={},Ua=B.defaults,lb;for(lb in Ua)if(Ua.hasOwnProperty(lb))n[lb]=
(e&&e.hasOwnProperty(lb)?e:Ua)[lb];var K=document.createElement("div");K.className="CodeMirror"+(n.lineWrapping?" CodeMirror-wrap":"");K.innerHTML='<div style="overflow: hidden; position: relative; width: 3px; height: 0px;"><textarea style="position: absolute; padding: 0; width: 1px; height: 1em" wrap="off" autocorrect="off" autocapitalize="off"></textarea></div><div class="CodeMirror-scroll" tabindex="-1"><div style="position: relative"><div style="position: relative"><div class="CodeMirror-gutter"><div class="CodeMirror-gutter-text"></div></div><div class="CodeMirror-lines"><div style="position: relative; z-index: 0"><div style="position: absolute; width: 100%; height: 0; overflow: hidden; visibility: hidden;"></div><pre class="CodeMirror-cursor">&#160;</pre><div style="position: relative; z-index: -1"></div><div></div></div></div></div></div></div>';
b.appendChild?b.appendChild(K):b(K);var Oa=K.firstChild,D=Oa.firstChild,w=K.lastChild,U=w.firstChild,tb=U.firstChild,V=tb.firstChild,hb=V.firstChild,C=V.nextSibling.firstChild,Ha=C.firstChild,Z=Ha.nextSibling,ub=Z.nextSibling,ca=ub.nextSibling;Fc();Gc();if(kc)D.style.width="0px";if(!lc)C.draggable=true;C.style.outline="none";if(n.tabindex!=null)D.tabIndex=n.tabindex;n.autofocus&&J();if(!n.gutter&&!n.lineNumbers)V.style.display="none";if(mc){Oa.style.height="1px";Oa.style.position="absolute"}try{Yb("x")}catch(nc){if(nc.message.match(/runtime/i))nc=
Error("A CodeMirror inside a P-style element does not work in Internet Explorer. (innerHTML bug)");throw nc;}var Tb=new oc,ld=new oc,Qb,M,t=new Fb([new Gb([new Ba("")])]),la,ea;Dc();var m={from:{line:0,ch:0},to:{line:0,ch:0},inverted:false},da,Hb,mb,pc=0,Mb,sb=false,pb=false,wa,vb,ha,cb,Fa,$a,ja,ab,bb,gb=0,P=0,$=0,zc=0,Aa,ga="",ra,Ec={};x(function(){p(n.value||"");wa=false})();var Y=new qc;E(w,"mousedown",x(function(a){function c(v){var u=Qa(v,true);if(u&&!L(u,j)){ea||S();j=u;xa(g,u);wa=false;var z=
fb();if(u.line>=z.to||u.line<z.from)l=setTimeout(x(function(){c(v)}),150)}}function d(v){clearTimeout(l);var u=Qa(v);u&&xa(g,u);R(v);J();wa=true;s();o()}xc(X(a,"shiftKey"));for(var f=a.target||a.srcElement;f!=K;f=f.parentNode)if(f.parentNode==U&&f!=tb)return;for(f=a.target||a.srcElement;f!=K;f=f.parentNode)if(f.parentNode==hb){n.onGutterClick&&n.onGutterClick(H,nb(hb.childNodes,f)+P,a);return R(a)}var g=Qa(a);switch(Uc(a)){case 3:Ya&&!Pb&&Nc(a);return;case 2:g&&Ga(g.line,g.ch,true);setTimeout(J,20);
return}if(g){ea||S();f=+new Date;if(mb&&mb.time>f-400&&L(mb.pos,g)){R(a);setTimeout(J,20);return ed(g.line)}else if(Hb&&Hb.time>f-400&&L(Hb.pos,g)){mb={time:f,pos:g};R(a);return Cc(g)}else Hb={time:f,pos:g};var j=g,l;if(n.dragDrop&&md&&!n.readOnly&&!L(m.from,m.to)&&!ma(g,m.from)&&!ma(m.to,g)){if(lc)C.draggable=true;f=function(v){if(lc)C.draggable=false;Mb=false;o();r();if(Math.abs(a.clientX-v.clientX)+Math.abs(a.clientY-v.clientY)<10){R(v);Ga(g.line,g.ch,true);J()}};var o=E(document,"mouseup",x(f),
true),r=E(w,"drop",x(f),true);Mb=true;C.dragDrop&&C.dragDrop()}else{R(a);Ga(g.line,g.ch,true);var s=E(document,"mousemove",x(function(v){clearTimeout(l);R(v);!Ka&&!Uc(v)?d(v):c(v)}),true);o=E(document,"mouseup",x(d),true)}}else(a.target||a.srcElement)==w&&R(a)}));E(w,"dblclick",x(function(a){for(var c=a.target||a.srcElement;c!=K;c=c.parentNode)if(c.parentNode==hb)return R(a);if(c=Qa(a)){mb={time:+new Date,pos:c};R(a);Cc(c)}}));E(C,"selectstart",R);Ya||E(w,"contextmenu",Nc);E(w,"scroll",function(){pc=
w.scrollTop;Ma([]);if(n.fixedGutter)V.style.left=w.scrollLeft+"px";n.onScroll&&n.onScroll(H)});E(window,"resize",function(){Ma(true)});E(D,"keyup",x(function(a){if(!(n.onKeyEvent&&n.onKeyEvent(H,Xa(a))))if(X(a,"keyCode")==16)da=null}));E(D,"input",na);E(D,"keydown",x(Za));E(D,"keypress",x(function(a){Ra&&ya();if(!(n.onKeyEvent&&n.onKeyEvent(H,Xa(a)))){var c=X(a,"keyCode"),d=X(a,"charCode");if(window.opera&&c==Ob){Ob=null;R(a)}else if(!((window.opera&&(!a.which||a.which<10)||mc)&&aa(a))){c=String.fromCharCode(d==
null?c:d);n.electricChars&&M.electricChars&&n.smartIndent&&!n.readOnly&&M.electricChars.indexOf(c)>-1&&setTimeout(x(function(){zb(m.to.line,"smart")}),75);ba(a,c)||na()}}}));E(D,"focus",S);E(D,"blur",fa);if(n.dragDrop){E(C,"dragstart",y);Ua=function(a){n.onDragEvent&&n.onDragEvent(H,Xa(a))||Db(a)};E(w,"dragenter",Ua);E(w,"dragover",Ua);E(w,"drop",x(q))}E(w,"paste",function(){J();na()});E(D,"paste",na);E(D,"cut",x(function(){n.readOnly||Q("")}));mc&&E(U,"mouseup",function(){document.activeElement==
D&&D.blur();J()});var Vc;try{Vc=document.activeElement==D}catch(pd){}Vc||n.autofocus?setTimeout(S,20):fa();var H=K.CodeMirror={getValue:function(){var a=[];t.iter(0,t.size,function(c){a.push(c.text)});return a.join("\n")},setValue:x(p),getSelection:ka,replaceSelection:x(Q),focus:function(){window.focus();J();S();na()},setOption:function(a,c){var d=n[a];n[a]=c;if(a=="mode"||a=="indentUnit")Dc();else if(a=="readOnly"&&c=="nocursor"){fa();D.blur()}else if(a=="readOnly"&&!c)A(true);else if(a=="theme")Fc();
else if(a=="lineWrapping"&&d!=c)x(fd)();else if(a=="tabSize")Ma(true);else a=="keyMap"&&Gc();if(a=="lineNumbers"||a=="gutter"||a=="firstLineNumber"||a=="theme"){d=n.gutter||n.lineNumbers;V.style.display=d?"":"none";if(d)ja=true;else ca.parentNode.style.marginLeft=0;Ma(true)}},getOption:function(a){return n[a]},undo:x(function(){T(Y.done,Y.undone)}),redo:x(function(){T(Y.undone,Y.done)}),indentLine:x(function(a,c){if(typeof c!="string")c=c==null?n.smartIndent?"smart":"prev":c?"add":"subtract";i(a)&&
zb(a,c)}),indentSelection:x(function(a){if(L(m.from,m.to))return zb(m.from.line,a);for(var c=m.to.line-(m.to.ch?0:1),d=m.from.line;d<=c;++d)zb(d,a)}),historySize:function(){return{undo:Y.done.length,redo:Y.undone.length}},clearHistory:function(){Y=new qc},matchBrackets:x(function(){Pc(true)}),getTokenAt:x(function(a){a=I(a);return h(a.line).getTokenAt(M,Ab(a.line),a.ch)}),getStateAfter:function(a){a=yb(a==null?t.size-1:a);return Ab(a+1)},cursorCoords:function(a,c){if(a==null)a=m.inverted;return this.charCoords(a?
m.from:m.to,c)},charCoords:function(a,c){a=I(a);if(c=="local")return ua(a,false);if(c=="div")return ua(a,true);var d=ua(a,true),f=Na(C);return{x:f.left+d.x,y:f.top+d.y,yBot:f.top+d.yBot}},coordsChar:function(a){var c=Na(C);return ec(a.x-c.left,a.y-c.top)},markText:x(dc),setBookmark:function(a){a=I(a);var c=new Wc(a.ch);h(a.line).addMark(c);return c},findMarksAt:function(a){a=I(a);var c=[],d=h(a.line).marked;if(!d)return c;for(var f=0,g=d.length;f<g;++f){var j=d[f];if((j.from==null||j.from<=a.ch)&&
(j.to==null||j.to>=a.ch))c.push(j.marker||j)}return c},setMarker:x(function(a,c,d){if(typeof a=="number")a=h(yb(a));a.gutterMarker={text:c,style:d};ja=true;return a}),clearMarker:x(function(a){if(typeof a=="number")a=h(yb(a));a.gutterMarker=null;ja=true}),setLineClass:x(function(a,c,d){return Hc(a,function(f){if(f.className!=c||f.bgClassName!=d){f.className=c;f.bgClassName=d;return true}})}),hideLine:x(function(a){return $b(a,true)}),showLine:x(function(a){return $b(a,false)}),onDeleteLine:function(a,
c){if(typeof a=="number"){if(!i(a))return null;a=h(a)}(a.handlers||(a.handlers=[])).push(c);return a},lineInfo:function(a){if(typeof a=="number"){if(!i(a))return null;var c=a;a=h(a);if(!a)return null}else{c=Sa(a);if(c==null)return null}var d=a.gutterMarker;return{line:c,handle:a,text:a.text,markerText:d&&d.text,markerClass:d&&d.style,lineClass:a.className,bgClass:a.bgClassName}},addWidget:function(a,c,d,f,g){a=ua(I(a));var j=a.yBot,l=a.x;c.style.position="absolute";U.appendChild(c);if(f=="over")j=
a.y;else if(f=="near"){f=Math.max(w.offsetHeight,t.height*Da());var o=Math.max(U.clientWidth,C.clientWidth)-C.offsetLeft;if(a.yBot+c.offsetHeight>f&&a.y>c.offsetHeight)j=a.y-c.offsetHeight;if(l+c.offsetWidth>o)l=o-c.offsetWidth}c.style.top=j+C.offsetTop+"px";c.style.left=c.style.right="";if(g=="right"){l=U.clientWidth-c.offsetWidth;c.style.right="0px"}else{if(g=="left")l=0;else if(g=="middle")l=(U.clientWidth-c.offsetWidth)/2;c.style.left=l+C.offsetLeft+"px"}d&&La(l,j,l+c.offsetWidth,j+c.offsetHeight)},
lineCount:function(){return t.size},clipPos:I,getCursor:function(a){if(a==null)a=m.inverted;return{line:(a?m.from:m.to).line,ch:(a?m.from:m.to).ch}},somethingSelected:function(){return!L(m.from,m.to)},setCursor:x(function(a,c,d){c==null&&typeof a.line=="number"?Ga(a.line,a.ch,d):Ga(a,c,d)}),setSelection:x(function(a,c,d){(d?xa:db)(I(a),I(c||a))}),getLine:function(a){if(i(a))return h(a).text},getLineHandle:function(a){if(i(a))return h(a)},setLine:x(function(a,c){i(a)&&N(c,{line:a,ch:0},{line:a,ch:h(a).text.length})}),
removeLine:x(function(a){i(a)&&N("",{line:a,ch:0},I({line:a+1,ch:0}))}),replaceRange:x(N),getRange:function(a,c){return sa(I(a),I(c))},triggerOnKeyDown:x(Za),execCommand:function(a){return uc[a](H)},moveH:x(function(a,c){var d=a<0?m.from:m.to;if(da||L(m.from,m.to))d=ac(a,c);Ga(d.line,d.ch,true)}),deleteH:x(function(a,c){if(L(m.from,m.to))a<0?N("",ac(a,c),m.to):N("",m.from,ac(a,c));else N("",m.from,m.to);vb=true}),moveV:x(function(a,c){var d=0,f=ua(m.inverted?m.from:m.to,true);if(wb!=null)f.x=wb;if(c==
"page")d=Math.min(w.clientHeight,window.innerHeight||document.documentElement.clientHeight);else if(c=="line")d=Da();d=ec(f.x,f.y+d*a+2);if(c=="page")w.scrollTop+=ua(d,true).y-f.y;Ga(d.line,d.ch,true);wb=f.x}),toggleOverwrite:function(){if(sb){sb=false;Z.className=Z.className.replace(" CodeMirror-overwrite","")}else{sb=true;Z.className+=" CodeMirror-overwrite"}},posFromIndex:function(a){var c=0,d;t.iter(0,t.size,function(f){f=f.text.length+1;if(f>a){d=a;return true}a-=f;++c});return I({line:c,ch:d})},
indexFromPos:function(a){if(a.line<0||a.ch<0)return 0;var c=a.ch;t.iter(0,a.line,function(d){c+=d.text.length+1});return c},scrollTo:function(a,c){if(a!=null)w.scrollLeft=a;if(c!=null)w.scrollTop=c;Ma([])},operation:function(a){return x(a)()},compoundChange:function(a){return sc(a)},refresh:function(){Ma(true);if(w.scrollHeight>pc)w.scrollTop=pc},getInputField:function(){return D},getWrapperElement:function(){return K},getScrollerElement:function(){return w},getGutterElement:function(){return V}},
Ob=null,wc,Ra=false,ta="",wb=null;cc.prototype.clear=x(function(){for(var a=Infinity,c=-Infinity,d=0,f=this.set.length;d<f;++d){var g=this.set[d],j=g.marked;if(j&&g.parent){g=Sa(g);a=Math.min(a,g);c=Math.max(c,g);for(g=0;g<j.length;++g)j[g].marker==this&&j.splice(g--,1)}}a!=Infinity&&ha.push({from:a,to:c+1})});cc.prototype.find=function(){for(var a,c,d=0,f=this.set.length;d<f;++d)for(var g=this.set[d],j=g.marked,l=0;l<j.length;++l){var o=j[l];if(o.marker==this)if(o.from!=null||o.to!=null){var r=Sa(g);
if(r!=null){if(o.from!=null)a={line:r,ch:o.from};if(o.to!=null)c={line:r,ch:o.to}}}}return{from:a,to:c}};var Jc="CodeMirror-temp-"+Math.floor(Math.random()*16777215).toString(16),fc,Kc,ib,Mc,Lc=0,ic={"(":")>",")":"(<","[":"]>","]":"[<","{":"}>","}":"{<"},Tc=0,ob;for(ob in Ib)if(Ib.propertyIsEnumerable(ob)&&!H.propertyIsEnumerable(ob))H[ob]=Ib[ob];return H}function Nb(b){return typeof b=="string"?va[b]:b}function qb(b,e,i,h,k){function p(q){q=Nb(q);var y=q[b];if(y!=null&&h(y))return true;if(q.nofallthrough){k&&
k();return true}q=q.fallthrough;if(q==null)return false;if(Object.prototype.toString.call(q)!="[object Array]")return p(q);y=0;for(var G=q.length;y<G;++y)if(p(q[y]))return true;return false}if(e&&p(e))return true;return p(i)}function Yc(b){b=Ja[X(b,"keyCode")];return b=="Ctrl"||b=="Alt"||b=="Shift"||b=="Mod"}function Ta(b,e){if(e===true)return e;if(b.copyState)return b.copyState(e);var i={},h;for(h in e){var k=e[h];if(k instanceof Array)k=k.concat([]);i[h]=k}return i}function jc(b,e,i){return b.startState?
b.startState(e,i):true}function Jb(b,e){this.pos=this.start=0;this.string=b;this.tabSize=e||8}function Bb(b,e,i,h){this.from=b;this.to=e;this.style=i;this.marker=h}function Wc(b){this.to=this.from=b;this.line=null}function Ba(b,e){this.styles=e||[b,null];this.text=b;this.height=1;this.stateAfter=this.parent=this.hidden=this.marked=this.gutterMarker=this.className=this.bgClassName=this.handlers=null}function Kb(b,e,i,h){for(var k=0,p=0,q=0;p<e;k+=2){var y=i[k],G=p+y.length;if(q==0){G>b&&h.push(y.slice(b-
p,Math.min(y.length,e-p)),i[k+1]);if(G>=b)q=1}else if(q==1)G>e?h.push(y.slice(0,e-p),i[k+1]):h.push(y,i[k+1]);p=G}}function Gb(b){this.lines=b;this.parent=null;for(var e=0,i=b.length,h=0;e<i;++e){b[e].parent=this;h+=b[e].height}this.height=h}function Fb(b){this.children=b;for(var e=0,i=0,h=0,k=b.length;h<k;++h){var p=b[h];e+=p.chunkSize();i+=p.height;p.parent=this}this.size=e;this.height=i;this.parent=null}function Sa(b){if(b.parent==null)return null;var e=b.parent;b=nb(e.lines,b);for(var i=e.parent;i;e=
i,i=i.parent)for(var h=0;;++h){if(i.children[h]==e)break;b+=i.children[h].chunkSize()}return b}function Wb(b,e){var i=0;a:do{for(var h=0,k=b.children.length;h<k;++h){var p=b.children[h],q=p.height;if(e<q){b=p;continue a}e-=q;i+=p.chunkSize()}return i}while(!b.lines);h=0;for(k=b.lines.length;h<k;++h){p=b.lines[h].height;if(e<p)break;e-=p}return i+h}function Xb(b,e){var i=0;a:do{for(var h=0,k=b.children.length;h<k;++h){var p=b.children[h],q=p.chunkSize();if(e<q){b=p;continue a}e-=q;i+=p.height}return i}while(!b.lines);
for(h=0;h<e;++h)i+=b.lines[h].height;return i}function qc(){this.time=0;this.done=[];this.undone=[];this.compound=0;this.closed=false}function nd(){Db(this)}function Xa(b){if(!b.stop)b.stop=nd;return b}function R(b){if(b.preventDefault)b.preventDefault();else b.returnValue=false}function Xc(b){if(b.stopPropagation)b.stopPropagation();else b.cancelBubble=true}function Db(b){R(b);Xc(b)}function Uc(b){if(b.which)return b.which;else if(b.button&1)return 1;else if(b.button&2)return 3;else if(b.button&
4)return 2}function X(b,e){return b.override&&b.override.hasOwnProperty(e)?b.override[e]:b[e]}function E(b,e,i,h){if(typeof b.addEventListener=="function"){b.addEventListener(e,i,false);if(h)return function(){b.removeEventListener(e,i,false)}}else{var k=function(p){i(p||window.event)};b.attachEvent("on"+e,k);if(h)return function(){b.detachEvent("on"+e,k)}}}function oc(){this.id=null}function rc(b,e,i){if(e==null){e=b.search(/[^\s\u00a0]/);if(e==-1)e=b.length}for(var h=0,k=0;h<e;++h)if(b.charAt(h)==
"\t")k+=i-k%i;else++k;return k}function Na(b,e){for(var i=b.ownerDocument.body,h=0,k=0,p=false,q=b;q;q=q.offsetParent){var y=q.offsetLeft,G=q.offsetTop;if(q==i){h+=Math.abs(y);k+=Math.abs(G)}else{h+=y;k+=G}if(y=e){y=q.currentStyle?q.currentStyle:window.getComputedStyle(q,null);y=y.position=="fixed"}if(y)p=true}i=e&&!p?null:i;for(q=b.parentNode;q!=i;q=q.parentNode)if(q.scrollLeft!=null){h-=q.scrollLeft;k-=q.scrollTop}return{left:h,top:k}}function yc(b){if(kc){b.selectionStart=0;b.selectionEnd=b.value.length}else b.select()}
function L(b,e){return b.line==e.line&&b.ch==e.ch}function ma(b,e){return b.line<e.line||b.line==e.line&&b.ch<e.ch}function Ia(b){Pa.textContent=b;return Pa.innerHTML}function Zc(b,e){if(!e)return 0;if(!b)return e.length;for(var i=b.length,h=e.length;i>=0&&h>=0;--i,--h)if(b.charAt(i)!=e.charAt(h))break;return h+1}function nb(b,e){if(b.indexOf)return b.indexOf(e);for(var i=0,h=b.length;i<h;++i)if(b[i]==e)return i;return-1}function bc(b){return/\w/.test(b)||b.toUpperCase()!=b.toLowerCase()}B.defaults=
{value:"",mode:null,theme:"default",indentUnit:2,indentWithTabs:false,smartIndent:true,tabSize:4,keyMap:"default",extraKeys:null,electricChars:true,autoClearEmptyLines:false,onKeyEvent:null,onDragEvent:null,lineWrapping:false,lineNumbers:false,gutter:false,fixedGutter:false,firstLineNumber:1,readOnly:false,dragDrop:true,onChange:null,onCursorActivity:null,onGutterClick:null,onHighlightComplete:null,onUpdate:null,onFocus:null,onBlur:null,onScroll:null,matchBrackets:false,workTime:100,workDelay:200,
pollInterval:100,undoDepth:40,tabindex:null,autofocus:null};var kc=/AppleWebKit/.test(navigator.userAgent)&&/Mobile\/\w+/.test(navigator.userAgent),Pb=kc||/Mac/.test(navigator.platform);/Win/.test(navigator.platform);var Lb=B.modes={},Va=B.mimeModes={};B.defineMode=function(b,e){if(!B.defaults.mode&&b!="null")B.defaults.mode=b;if(arguments.length>2){e.dependencies=[];for(var i=2;i<arguments.length;++i)e.dependencies.push(arguments[i])}Lb[b]=e};B.defineMIME=function(b,e){Va[b]=e};B.resolveMode=function(b){if(typeof b==
"string"&&Va.hasOwnProperty(b))b=Va[b];else if(typeof b=="string"&&/^[\w\-]+\/[\w\-]+\+xml$/.test(b))return B.resolveMode("application/xml");return typeof b=="string"?{name:b}:b||{name:"null"}};B.getMode=function(b,e){e=B.resolveMode(e);var i=Lb[e.name];if(!i)return B.getMode(b,"text/plain");return i(b,e)};B.listModes=function(){var b=[],e;for(e in Lb)Lb.propertyIsEnumerable(e)&&b.push(e);return b};B.listMIMEs=function(){var b=[],e;for(e in Va)Va.propertyIsEnumerable(e)&&b.push({mime:e,mode:Va[e]});
return b};var Ib=B.extensions={};B.defineExtension=function(b,e){Ib[b]=e};var uc=B.commands={selectAll:function(b){b.setSelection({line:0,ch:0},{line:b.lineCount()-1})},killLine:function(b){var e=b.getCursor(true),i=b.getCursor(false),h=!L(e,i);!h&&b.getLine(e.line).length==e.ch?b.replaceRange("",e,{line:e.line+1,ch:0}):b.replaceRange("",e,h?i:{line:e.line})},deleteLine:function(b){var e=b.getCursor().line;b.replaceRange("",{line:e,ch:0},{line:e})},undo:function(b){b.undo()},redo:function(b){b.redo()},
goDocStart:function(b){b.setCursor(0,0,true)},goDocEnd:function(b){b.setSelection({line:b.lineCount()-1},null,true)},goLineStart:function(b){b.setCursor(b.getCursor().line,0,true)},goLineStartSmart:function(b){var e=b.getCursor(),i=b.getLine(e.line);i=Math.max(0,i.search(/\S/));b.setCursor(e.line,e.ch<=i&&e.ch?0:i,true)},goLineEnd:function(b){b.setSelection({line:b.getCursor().line},null,true)},goLineUp:function(b){b.moveV(-1,"line")},goLineDown:function(b){b.moveV(1,"line")},goPageUp:function(b){b.moveV(-1,
"page")},goPageDown:function(b){b.moveV(1,"page")},goCharLeft:function(b){b.moveH(-1,"char")},goCharRight:function(b){b.moveH(1,"char")},goColumnLeft:function(b){b.moveH(-1,"column")},goColumnRight:function(b){b.moveH(1,"column")},goWordLeft:function(b){b.moveH(-1,"word")},goWordRight:function(b){b.moveH(1,"word")},delCharLeft:function(b){b.deleteH(-1,"char")},delCharRight:function(b){b.deleteH(1,"char")},delWordLeft:function(b){b.deleteH(-1,"word")},delWordRight:function(b){b.deleteH(1,"word")},
indentAuto:function(b){b.indentSelection("smart")},indentMore:function(b){b.indentSelection("add")},indentLess:function(b){b.indentSelection("subtract")},insertTab:function(b){b.replaceSelection("\t","end")},defaultTab:function(b){b.somethingSelected()?b.indentSelection("add"):b.replaceSelection("\t","end")},transposeChars:function(b){var e=b.getCursor(),i=b.getLine(e.line);e.ch>0&&e.ch<i.length-1&&b.replaceRange(i.charAt(e.ch)+i.charAt(e.ch-1),{line:e.line,ch:e.ch-1},{line:e.line,ch:e.ch+1})},newlineAndIndent:function(b){b.replaceSelection("\n",
"end");b.indentLine(b.getCursor().line)},toggleOverwrite:function(b){b.toggleOverwrite()}},va=B.keyMap={};va.basic={Left:"goCharLeft",Right:"goCharRight",Up:"goLineUp",Down:"goLineDown",End:"goLineEnd",Home:"goLineStartSmart",PageUp:"goPageUp",PageDown:"goPageDown",Delete:"delCharRight",Backspace:"delCharLeft",Tab:"defaultTab","Shift-Tab":"indentAuto",Enter:"newlineAndIndent",Insert:"toggleOverwrite"};va.pcDefault={"Ctrl-A":"selectAll","Ctrl-D":"deleteLine","Ctrl-Z":"undo","Shift-Ctrl-Z":"redo","Ctrl-Y":"redo",
"Ctrl-Home":"goDocStart","Alt-Up":"goDocStart","Ctrl-End":"goDocEnd","Ctrl-Down":"goDocEnd","Ctrl-Left":"goWordLeft","Ctrl-Right":"goWordRight","Alt-Left":"goLineStart","Alt-Right":"goLineEnd","Ctrl-Backspace":"delWordLeft","Ctrl-Delete":"delWordRight","Ctrl-S":"save","Ctrl-F":"find","Ctrl-G":"findNext","Shift-Ctrl-G":"findPrev","Shift-Ctrl-F":"replace","Shift-Ctrl-R":"replaceAll","Ctrl-[":"indentLess","Ctrl-]":"indentMore",fallthrough:"basic"};va.macDefault={"Cmd-A":"selectAll","Cmd-D":"deleteLine",
"Cmd-Z":"undo","Shift-Cmd-Z":"redo","Cmd-Y":"redo","Cmd-Up":"goDocStart","Cmd-End":"goDocEnd","Cmd-Down":"goDocEnd","Alt-Left":"goWordLeft","Alt-Right":"goWordRight","Cmd-Left":"goLineStart","Cmd-Right":"goLineEnd","Alt-Backspace":"delWordLeft","Ctrl-Alt-Backspace":"delWordRight","Alt-Delete":"delWordRight","Cmd-S":"save","Cmd-F":"find","Cmd-G":"findNext","Shift-Cmd-G":"findPrev","Cmd-Alt-F":"replace","Shift-Cmd-Alt-F":"replaceAll","Cmd-[":"indentLess","Cmd-]":"indentMore",fallthrough:["basic","emacsy"]};
va["default"]=Pb?va.macDefault:va.pcDefault;va.emacsy={"Ctrl-F":"goCharRight","Ctrl-B":"goCharLeft","Ctrl-P":"goLineUp","Ctrl-N":"goLineDown","Alt-F":"goWordRight","Alt-B":"goWordLeft","Ctrl-A":"goLineStart","Ctrl-E":"goLineEnd","Ctrl-V":"goPageUp","Shift-Ctrl-V":"goPageDown","Ctrl-D":"delCharRight","Ctrl-H":"delCharLeft","Alt-D":"delWordRight","Alt-Backspace":"delWordLeft","Ctrl-K":"killLine","Ctrl-T":"transposeChars"};B.fromTextArea=function(b,e){function i(){b.value=q.getValue()}e||(e={});e.value=
b.value;if(!e.tabindex&&b.tabindex)e.tabindex=b.tabindex;if(e.autofocus==null&&b.getAttribute("autofocus")!=null)e.autofocus=true;if(b.form){var h=E(b.form,"submit",i,true);if(typeof b.form.submit=="function"){var k=b.form.submit,p=function(){i();b.form.submit=k;b.form.submit();b.form.submit=p};b.form.submit=p}}b.style.display="none";var q=B(function(y){b.parentNode.insertBefore(y,b.nextSibling)},e);q.save=i;q.getTextArea=function(){return b};q.toTextArea=function(){i();b.parentNode.removeChild(q.getWrapperElement());
b.style.display="";if(b.form){h();if(typeof b.form.submit=="function")b.form.submit=k}};return q};B.copyState=Ta;B.startState=jc;Jb.prototype={eol:function(){return this.pos>=this.string.length},sol:function(){return this.pos==0},peek:function(){return this.string.charAt(this.pos)},next:function(){if(this.pos<this.string.length)return this.string.charAt(this.pos++)},eat:function(b){var e=this.string.charAt(this.pos);if(typeof b=="string"?e==b:e&&(b.test?b.test(e):b(e))){++this.pos;return e}},eatWhile:function(b){for(var e=
this.pos;this.eat(b););return this.pos>e},eatSpace:function(){for(var b=this.pos;/[\s\u00a0]/.test(this.string.charAt(this.pos));)++this.pos;return this.pos>b},skipToEnd:function(){this.pos=this.string.length},skipTo:function(b){b=this.string.indexOf(b,this.pos);if(b>-1){this.pos=b;return true}},backUp:function(b){this.pos-=b},column:function(){return rc(this.string,this.start,this.tabSize)},indentation:function(){return rc(this.string,null,this.tabSize)},match:function(b,e,i){if(typeof b=="string"){if((i?
this.string.toLowerCase():this.string).indexOf(i?b.toLowerCase():b,this.pos)==this.pos){if(e!==false)this.pos+=b.length;return true}}else{if((b=this.string.slice(this.pos).match(b))&&e!==false)this.pos+=b[0].length;return b}},current:function(){return this.string.slice(this.start,this.pos)}};B.StringStream=Jb;Bb.prototype={attach:function(b){this.marker.set.push(b)},detach:function(b){b=nb(this.marker.set,b);b>-1&&this.marker.set.splice(b,1)},split:function(b,e){if(this.to<=b&&this.to!=null)return null;
return new Bb(this.from<b||this.from==null?null:this.from-b+e,this.to==null?null:this.to-b+e,this.style,this.marker)},dup:function(){return new Bb(null,null,this.style,this.marker)},clipTo:function(b,e,i,h,k){if(b&&h>this.from&&(h<this.to||this.to==null))this.from=null;else if(this.from!=null&&this.from>=e)this.from=Math.max(h,this.from)+k;if(i&&(e<this.to||this.to==null)&&(e>this.from||this.from==null))this.to=null;else if(this.to!=null&&this.to>e)this.to=h<this.to?this.to+k:e},isDead:function(){return this.from!=
null&&this.to!=null&&this.from>=this.to},sameSet:function(b){return this.marker==b.marker}};Wc.prototype={attach:function(b){this.line=b},detach:function(b){if(this.line==b)this.line=null},split:function(b,e){if(b<this.from){this.from=this.to=this.from-b+e;return this}},isDead:function(){return this.from>this.to},clipTo:function(b,e,i,h,k){if((b||e<this.from)&&(i||h>this.to)){this.from=0;this.to=-1}else if(this.from>e)this.from=this.to=Math.max(h,this.from)+k},sameSet:function(){return false},find:function(){if(!this.line||
!this.line.parent)return null;return{line:Sa(this.line),ch:this.from}},clear:function(){if(this.line){var b=nb(this.line.marked,this);b!=-1&&this.line.marked.splice(b,1);this.line=null}}};Ba.inheritMarks=function(b,e){var i=new Ba(b),h=e&&e.marked;if(h)for(var k=0;k<h.length;++k)if(h[k].to==null&&h[k].style){var p=i.marked||(i.marked=[]),q=h[k].dup();p.push(q);q.attach(i)}return i};Ba.prototype={replace:function(b,e,i){var h=[],k=this.marked,p=e==null?this.text.length:e;Kb(0,b,this.styles,h);i&&h.push(i,
null);Kb(p,this.text.length,this.styles,h);this.styles=h;this.text=this.text.slice(0,b)+i+this.text.slice(p);this.stateAfter=null;if(k){i=i.length-(p-b);for(h=0;h<k.length;++h){var q=k[h];q.clipTo(b==null,b||0,e==null,p,i);if(q.isDead()){q.detach(this);k.splice(h--,1)}}}},split:function(b,e){var i=[e,null],h=this.marked;Kb(b,this.text.length,this.styles,i);i=new Ba(e+this.text.slice(b),i);if(h)for(var k=0;k<h.length;++k){var p=h[k],q=p.split(b,e.length);if(q){if(!i.marked)i.marked=[];i.marked.push(q);
q.attach(i);q==p&&h.splice(k--,1)}}return i},append:function(b){var e=this.text.length,i=b.marked,h=this.marked;this.text+=b.text;Kb(0,b.text.length,b.styles,this.styles);if(h)for(b=0;b<h.length;++b)if(h[b].to==null)h[b].to=e;if(i&&i.length){if(!h)this.marked=h=[];b=0;a:for(;b<i.length;++b){var k=i[b];if(!k.from)for(var p=0;p<h.length;++p){var q=h[p];if(q.to==e&&q.sameSet(k)){q.to=k.to==null?null:k.to+e;if(q.isDead()){q.detach(this);i.splice(b--,1)}continue a}}h.push(k);k.attach(this);k.from+=e;if(k.to!=
null)k.to+=e}}},fixMarkEnds:function(b){var e=this.marked;b=b.marked;if(e)for(var i=0;i<e.length;++i){var h=e[i],k=h.to==null;if(k&&b)for(var p=0;p<b.length;++p)if(b[p].sameSet(h)){k=false;break}if(k)h.to=this.text.length}},fixMarkStarts:function(){var b=this.marked;if(b)for(var e=0;e<b.length;++e)if(b[e].from==null)b[e].from=0},addMark:function(b){b.attach(this);if(this.marked==null)this.marked=[];this.marked.push(b);this.marked.sort(function(e,i){return(e.from||0)-(i.from||0)})},highlight:function(b,
e,i){i=new Jb(this.text,i);var h=this.styles,k=0,p=false,q=h[0],y;for(this.text==""&&b.blankLine&&b.blankLine(e);!i.eol();){var G=b.token(i,e),aa=this.text.slice(i.start,i.pos);i.start=i.pos;if(k&&h[k-1]==G)h[k-2]+=aa;else if(aa){if(!p&&(h[k+1]!=G||k&&h[k-2]!=y))p=true;h[k++]=aa;h[k++]=G;y=q;q=h[k]}if(i.pos>5E3){h[k++]=this.text.slice(i.pos);h[k++]=null;break}}if(h.length!=k){h.length=k;p=true}if(k&&h[k-2]!=y)p=true;return p||(h.length<5&&this.text.length<10?null:false)},getTokenAt:function(b,e,i){for(var h=
new Jb(this.text);h.pos<i&&!h.eol();){h.start=h.pos;var k=b.token(h,e)}return{start:h.start,end:h.pos,string:h.current(),className:k||null,state:e}},indentation:function(b){return rc(this.text,null,b)},getHTML:function(b,e,i,h){function k(A,J){if(A){if(y&&Ka&&A.charAt(0)==" ")A="\u00a0"+A.slice(1);y=false;if(A.indexOf("\t")==-1){G+=A.length;var ia=Ia(A)}else{ia="";for(var W=0;;){var La=A.indexOf("\t",W);if(La==-1){ia+=Ia(A.slice(W));G+=A.length-W;break}else{G+=La-W;var fb=b(G);ia+=Ia(A.slice(W,La))+
fb.html;G+=fb.width;W=La+1}}}J?q.push('<span class="',J,'">',ia,"</span>"):q.push(ia)}}function p(A){if(!A)return null;return"cm-"+A.replace(/ +/g," cm-")}var q=[],y=true,G=0,aa=k;if(e!=null){var ba=0,Za='<span id="'+i+'">';aa=function(A,J){var ia=A.length;if(e>=ba&&e<ba+ia){if(e>ba){k(A.slice(0,e-ba),J);h&&q.push("<wbr>")}q.push(Za);var W=e-ba;k(window.opera?A.slice(W,W+1):A.slice(W),J);q.push("</span>");window.opera&&k(A.slice(W+1),J);e--;ba+=ia}else{ba+=ia;k(A,J);if(ba==e&&ba==pa)q.push(Za+" </span>");
else if(ba>e+10&&/\s/.test(A))aa=function(){}}}}i=this.styles;var S=this.text,fa=this.marked,pa=S.length;if(!S&&e==null)aa(" ");else if(!fa||!fa.length)for(var T=S=0;T<pa;S+=2){var qa=i[S],eb=i[S+1],N=qa.length;if(T+N>pa)qa=qa.slice(0,pa-T);T+=N;aa(qa,p(eb))}else{var Q=0;S=0;T="";var Ea=fa[0].from||0,sa=[],ka=0;for(qa=function(){for(var A;ka<fa.length&&((A=fa[ka]).from==Q||A.from==null);){A.style!=null&&sa.push(A);++ka}Ea=ka<fa.length?fa[ka].from:Infinity;for(A=0;A<sa.length;++A){var J=sa[A].to||
Infinity;if(J==Q)sa.splice(A--,1);else Ea=Math.min(J,Ea)}};Q<pa;){Ea==Q&&qa();for(N=Math.min(pa,Ea);;){if(T){for(var za=Q+T.length,na=eb,ya=0;ya<sa.length;++ya)na=(na?na+" ":"")+sa[ya].style;aa(za>N?T.slice(0,N-Q):T,na);if(za>=N){T=T.slice(N-Q);Q=N;break}Q=za}T=i[S++];eb=p(i[S++])}}}return q.join("")},cleanUp:function(){this.parent=null;if(this.marked)for(var b=0,e=this.marked.length;b<e;++b)this.marked[b].detach(this)}};Gb.prototype={chunkSize:function(){return this.lines.length},remove:function(b,
e,i){for(var h=b,k=b+e;h<k;++h){var p=this.lines[h];this.height-=p.height;p.cleanUp();if(p.handlers)for(var q=0;q<p.handlers.length;++q)i.push(p.handlers[q])}this.lines.splice(b,e)},collapse:function(b){b.splice.apply(b,[b.length,0].concat(this.lines))},insertHeight:function(b,e,i){this.height+=i;this.lines=this.lines.slice(0,b).concat(e).concat(this.lines.slice(b));b=0;for(i=e.length;b<i;++b)e[b].parent=this},iterN:function(b,e,i){for(e=b+e;b<e;++b)if(i(this.lines[b]))return true}};Fb.prototype=
{chunkSize:function(){return this.size},remove:function(b,e,i){this.size-=e;for(var h=0;h<this.children.length;++h){var k=this.children[h],p=k.chunkSize();if(b<p){var q=Math.min(e,p-b),y=k.height;k.remove(b,q,i);this.height-=y-k.height;if(p==q){this.children.splice(h--,1);k.parent=null}if((e-=q)==0)break;b=0}else b-=p}if(this.size-e<25){b=[];this.collapse(b);this.children=[new Gb(b)];this.children[0].parent=this}},collapse:function(b){for(var e=0,i=this.children.length;e<i;++e)this.children[e].collapse(b)},
insert:function(b,e){for(var i=0,h=0,k=e.length;h<k;++h)i+=e[h].height;this.insertHeight(b,e,i)},insertHeight:function(b,e,i){this.size+=e.length;this.height+=i;for(var h=0,k=this.children.length;h<k;++h){var p=this.children[h],q=p.chunkSize();if(b<=q){p.insertHeight(b,e,i);if(p.lines&&p.lines.length>50){for(;p.lines.length>50;){b=p.lines.splice(p.lines.length-25,25);b=new Gb(b);p.height-=b.height;this.children.splice(h+1,0,b);b.parent=this}this.maybeSpill()}break}b-=q}},maybeSpill:function(){if(!(this.children.length<=
10)){var b=this;do{var e=b.children.splice(b.children.length-5,5);e=new Fb(e);if(b.parent){b.size-=e.size;b.height-=e.height;var i=nb(b.parent.children,b);b.parent.children.splice(i+1,0,e)}else{i=new Fb(b.children);i.parent=b;b.children=[i,e];b=i}e.parent=b.parent}while(b.children.length>10);b.parent.maybeSpill()}},iter:function(b,e,i){this.iterN(b,e-b,i)},iterN:function(b,e,i){for(var h=0,k=this.children.length;h<k;++h){var p=this.children[h],q=p.chunkSize();if(b<q){q=Math.min(e,q-b);if(p.iterN(b,
q,i))return true;if((e-=q)==0)break;b=0}else b-=q}}};qc.prototype={addChange:function(b,e,i){this.undone.length=0;var h=+new Date,k=this.done[this.done.length-1],p=k&&k[k.length-1],q=h-this.time;if(this.compound&&k&&!this.closed)k.push({start:b,added:e,old:i});else if(q>400||!p||this.closed||p.start>b+i.length||p.start+p.added<b){this.done.push([{start:b,added:e,old:i}]);this.closed=false}else{k=Math.max(0,p.start-b);q=Math.max(0,b+i.length-(p.start+p.added));for(var y=k;y>0;--y)p.old.unshift(i[y-
1]);for(y=q;y>0;--y)p.old.push(i[i.length-y]);if(k)p.start=b;p.added+=e-(i.length-k-q)}this.time=h},startCompound:function(){if(!this.compound++)this.closed=true},endCompound:function(){if(!--this.compound)this.closed=true}};B.e_stop=Db;B.e_preventDefault=R;B.e_stopPropagation=Xc;B.connect=E;oc.prototype={set:function(b,e){clearTimeout(this.id);this.id=setTimeout(e,b)}};var vc=B.Pass={toString:function(){return"CodeMirror.Pass"}},Ya=/gecko\/\d{7}/i.test(navigator.userAgent),Ka=/MSIE \d/.test(navigator.userAgent),
Oc=/MSIE [1-8]\b/.test(navigator.userAgent),dd=Ka&&document.documentMode==5,lc=/WebKit\//.test(navigator.userAgent),tc=/Chrome\//.test(navigator.userAgent),od=/Apple Computer/.test(navigator.vendor),mc=/KHTML\//.test(navigator.userAgent),md=function(){if(Oc)return false;var b=document.createElement("div");return"draggable"in b||"dragDrop"in b}();(function(){var b=document.createElement("textarea");b.value="foo\nbar";if(b.value.indexOf("\r")>-1)return"\r\n";return"\n"})();var Cb=/^$/;if(Ya)Cb=/$'/;
else if(od)Cb=/\-[^ \-?]|\?[^ !'\"\),.\-\/:;\?\]\}]/;else if(tc)Cb=/\-[^ \-\.?]|\?[^ \-\.?\]\}:;!'\"\),\/]|[\.!\"#&%\)*+,:;=>\]|\}~][\(\{\[<]|\$'/;if(document.documentElement.getBoundingClientRect!=null)Na=function(b,e){try{var i=b.getBoundingClientRect();i={top:i.top,left:i.left}}catch(h){i={top:0,left:0}}if(!e)if(window.pageYOffset==null){var k=document.documentElement||document.body.parentNode;if(k.scrollTop==null)k=document.body;i.top+=k.scrollTop;i.left+=k.scrollLeft}else{i.top+=window.pageYOffset;
i.left+=window.pageXOffset}return i};var Pa=document.createElement("pre");if(Ia("a")=="\na")Ia=function(b){Pa.textContent=b;return Pa.innerHTML.slice(1)};else if(Ia("\t")!="\t")Ia=function(b){Pa.innerHTML="";Pa.appendChild(document.createTextNode(b));return Pa.innerHTML};B.htmlEscape=Ia;var Wa="\n\nb".split(/\n/).length!=3?function(b){for(var e=0,i,h=[];(i=b.indexOf("\n",e))>-1;){h.push(b.slice(e,b.charAt(i-1)=="\r"?i-1:i));e=i+1}h.push(b.slice(e));return h}:function(b){return b.split(/\r?\n/)};B.splitLines=
Wa;var ad=window.getSelection?function(b){try{return b.selectionStart!=b.selectionEnd}catch(e){return false}}:function(b){try{var e=b.ownerDocument.selection.createRange()}catch(i){}if(!e||e.parentElement()!=b)return false;return e.compareEndPoints("StartToEnd",e)!=0};B.defineMode("null",function(){return{token:function(b){b.skipToEnd()}}});B.defineMIME("text/plain","null");var Ja={3:"Enter",8:"Backspace",9:"Tab",13:"Enter",16:"Shift",17:"Ctrl",18:"Alt",19:"Pause",20:"CapsLock",27:"Esc",32:"Space",
33:"PageUp",34:"PageDown",35:"End",36:"Home",37:"Left",38:"Up",39:"Right",40:"Down",44:"PrintScrn",45:"Insert",46:"Delete",59:";",91:"Mod",92:"Mod",93:"Mod",127:"Delete",186:";",187:"=",188:",",189:"-",190:".",191:"/",192:"`",219:"[",220:"\\",221:"]",222:"'",63276:"PageUp",63277:"PageDown",63275:"End",63273:"Home",63234:"Left",63232:"Up",63235:"Right",63233:"Down",63302:"Insert",63272:"Delete"};B.keyNames=Ja;(function(){for(var b=0;b<10;b++)Ja[b+48]=String(b);for(b=65;b<=90;b++)Ja[b]=String.fromCharCode(b);
for(b=1;b<=12;b++)Ja[b+111]=Ja[b+63235]="F"+b})();return B}();
;
CodeMirror.defineMode("xml", function(config, parserConfig) {
  var indentUnit = config.indentUnit;
  var Kludges = parserConfig.htmlMode ? {
    autoSelfClosers: {'area': true, 'base': true, 'br': true, 'col': true, 'command': true,
                      'embed': true, 'frame': true, 'hr': true, 'img': true, 'input': true,
                      'keygen': true, 'link': true, 'meta': true, 'param': true, 'source': true,
                      'track': true, 'wbr': true},
    implicitlyClosed: {'dd': true, 'li': true, 'optgroup': true, 'option': true, 'p': true,
                       'rp': true, 'rt': true, 'tbody': true, 'td': true, 'tfoot': true,
                       'th': true, 'tr': true},
    contextGrabbers: {
      'dd': {'dd': true, 'dt': true},
      'dt': {'dd': true, 'dt': true},
      'li': {'li': true},
      'option': {'option': true, 'optgroup': true},
      'optgroup': {'optgroup': true},
      'p': {'address': true, 'article': true, 'aside': true, 'blockquote': true, 'dir': true,
            'div': true, 'dl': true, 'fieldset': true, 'footer': true, 'form': true,
            'h1': true, 'h2': true, 'h3': true, 'h4': true, 'h5': true, 'h6': true,
            'header': true, 'hgroup': true, 'hr': true, 'menu': true, 'nav': true, 'ol': true,
            'p': true, 'pre': true, 'section': true, 'table': true, 'ul': true},
      'rp': {'rp': true, 'rt': true},
      'rt': {'rp': true, 'rt': true},
      'tbody': {'tbody': true, 'tfoot': true},
      'td': {'td': true, 'th': true},
      'tfoot': {'tbody': true},
      'th': {'td': true, 'th': true},
      'thead': {'tbody': true, 'tfoot': true},
      'tr': {'tr': true}
    },
    doNotIndent: {"pre": true},
    allowUnquoted: true,
    allowMissing: false
  } : {
    autoSelfClosers: {},
    implicitlyClosed: {},
    contextGrabbers: {},
    doNotIndent: {},
    allowUnquoted: false,
    allowMissing: false
  };
  var alignCDATA = parserConfig.alignCDATA;

  // Return variables for tokenizers
  var tagName, type;

  function inText(stream, state) {
    function chain(parser) {
      state.tokenize = parser;
      return parser(stream, state);
    }

    var ch = stream.next();
    if (ch == "<") {
      if (stream.eat("!")) {
        if (stream.eat("[")) {
          if (stream.match("CDATA[")) return chain(inBlock("atom", "]]>"));
          else return null;
        }
        else if (stream.match("--")) return chain(inBlock("comment", "-->"));
        else if (stream.match("DOCTYPE", true, true)) {
          stream.eatWhile(/[\w\._\-]/);
          return chain(doctype(1));
        }
        else return null;
      }
      else if (stream.eat("?")) {
        stream.eatWhile(/[\w\._\-]/);
        state.tokenize = inBlock("meta", "?>");
        return "meta";
      }
      else {
        type = stream.eat("/") ? "closeTag" : "openTag";
        stream.eatSpace();
        tagName = "";
        var c;
        while ((c = stream.eat(/[^\s\u00a0=<>\"\'\/?]/))) tagName += c;
        state.tokenize = inTag;
        return "tag";
      }
    }
    else if (ch == "&") {
      var ok;
      if (stream.eat("#")) {
        if (stream.eat("x")) {
          ok = stream.eatWhile(/[a-fA-F\d]/) && stream.eat(";");          
        } else {
          ok = stream.eatWhile(/[\d]/) && stream.eat(";");
        }
      } else {
        ok = stream.eatWhile(/[\w\.\-:]/) && stream.eat(";");
      }
      return ok ? "atom" : "error";
    }
    else {
      stream.eatWhile(/[^&<]/);
      return null;
    }
  }

  function inTag(stream, state) {
    var ch = stream.next();
    if (ch == ">" || (ch == "/" && stream.eat(">"))) {
      state.tokenize = inText;
      type = ch == ">" ? "endTag" : "selfcloseTag";
      return "tag";
    }
    else if (ch == "=") {
      type = "equals";
      return null;
    }
    else if (/[\'\"]/.test(ch)) {
      state.tokenize = inAttribute(ch);
      return state.tokenize(stream, state);
    }
    else {
      stream.eatWhile(/[^\s\u00a0=<>\"\'\/?]/);
      return "word";
    }
  }

  function inAttribute(quote) {
    return function(stream, state) {
      while (!stream.eol()) {
        if (stream.next() == quote) {
          state.tokenize = inTag;
          break;
        }
      }
      return "string";
    };
  }

  function inBlock(style, terminator) {
    return function(stream, state) {
      while (!stream.eol()) {
        if (stream.match(terminator)) {
          state.tokenize = inText;
          break;
        }
        stream.next();
      }
      return style;
    };
  }
  function doctype(depth) {
    return function(stream, state) {
      var ch;
      while ((ch = stream.next()) != null) {
        if (ch == "<") {
          state.tokenize = doctype(depth + 1);
          return state.tokenize(stream, state);
        } else if (ch == ">") {
          if (depth == 1) {
            state.tokenize = inText;
            break;
          } else {
            state.tokenize = doctype(depth - 1);
            return state.tokenize(stream, state);
          }
        }
      }
      return "meta";
    };
  }

  var curState, setStyle;
  function pass() {
    for (var i = arguments.length - 1; i >= 0; i--) curState.cc.push(arguments[i]);
  }
  function cont() {
    pass.apply(null, arguments);
    return true;
  }

  function pushContext(tagName, startOfLine) {
    var noIndent = Kludges.doNotIndent.hasOwnProperty(tagName) || (curState.context && curState.context.noIndent);
    curState.context = {
      prev: curState.context,
      tagName: tagName,
      indent: curState.indented,
      startOfLine: startOfLine,
      noIndent: noIndent
    };
  }
  function popContext() {
    if (curState.context) curState.context = curState.context.prev;
  }

  function element(type) {
    if (type == "openTag") {
      curState.tagName = tagName;
      return cont(attributes, endtag(curState.startOfLine));
    } else if (type == "closeTag") {
      var err = false;
      if (curState.context) {
        if (curState.context.tagName != tagName) {
          if (Kludges.implicitlyClosed.hasOwnProperty(curState.context.tagName.toLowerCase())) {
            popContext();
          }
          err = !curState.context || curState.context.tagName != tagName;
        }
      } else {
        err = true;
      }
      if (err) setStyle = "error";
      return cont(endclosetag(err));
    }
    return cont();
  }
  function endtag(startOfLine) {
    return function(type) {
      if (type == "selfcloseTag" ||
          (type == "endTag" && Kludges.autoSelfClosers.hasOwnProperty(curState.tagName.toLowerCase()))) {
        maybePopContext(curState.tagName.toLowerCase());
        return cont();
      }
      if (type == "endTag") {
        maybePopContext(curState.tagName.toLowerCase());
        pushContext(curState.tagName, startOfLine);
        return cont();
      }
      return cont();
    };
  }
  function endclosetag(err) {
    return function(type) {
      if (err) setStyle = "error";
      if (type == "endTag") { popContext(); return cont(); }
      setStyle = "error";
      return cont(arguments.callee);
    }
  }
  function maybePopContext(nextTagName) {
    var parentTagName;
    while (true) {
      if (!curState.context) {
        return;
      }
      parentTagName = curState.context.tagName.toLowerCase();
      if (!Kludges.contextGrabbers.hasOwnProperty(parentTagName) ||
          !Kludges.contextGrabbers[parentTagName].hasOwnProperty(nextTagName)) {
        return;
      }
      popContext();
    }
  }

  function attributes(type) {
    if (type == "word") {setStyle = "attribute"; return cont(attribute, attributes);}
    if (type == "endTag" || type == "selfcloseTag") return pass();
    setStyle = "error";
    return cont(attributes);
  }
  function attribute(type) {
    if (type == "equals") return cont(attvalue, attributes);
    if (!Kludges.allowMissing) setStyle = "error";
    return (type == "endTag" || type == "selfcloseTag") ? pass() : cont();
  }
  function attvalue(type) {
    if (type == "string") return cont(attvaluemaybe);
    if (type == "word" && Kludges.allowUnquoted) {setStyle = "string"; return cont();}
    setStyle = "error";
    return (type == "endTag" || type == "selfCloseTag") ? pass() : cont();
  }
  function attvaluemaybe(type) {
    if (type == "string") return cont(attvaluemaybe);
    else return pass();
  }

  return {
    startState: function() {
      return {tokenize: inText, cc: [], indented: 0, startOfLine: true, tagName: null, context: null};
    },

    token: function(stream, state) {
      if (stream.sol()) {
        state.startOfLine = true;
        state.indented = stream.indentation();
      }
      if (stream.eatSpace()) return null;

      setStyle = type = tagName = null;
      var style = state.tokenize(stream, state);
      state.type = type;
      if ((style || type) && style != "comment") {
        curState = state;
        while (true) {
          var comb = state.cc.pop() || element;
          if (comb(type || style)) break;
        }
      }
      state.startOfLine = false;
      return setStyle || style;
    },

    indent: function(state, textAfter, fullLine) {
      var context = state.context;
      if ((state.tokenize != inTag && state.tokenize != inText) ||
          context && context.noIndent)
        return fullLine ? fullLine.match(/^(\s*)/)[0].length : 0;
      if (alignCDATA && /<!\[CDATA\[/.test(textAfter)) return 0;
      if (context && /^<\//.test(textAfter))
        context = context.prev;
      while (context && !context.startOfLine)
        context = context.prev;
      if (context) return context.indent + indentUnit;
      else return 0;
    },

    compareStates: function(a, b) {
      if (a.indented != b.indented || a.tokenize != b.tokenize) return false;
      for (var ca = a.context, cb = b.context; ; ca = ca.prev, cb = cb.prev) {
        if (!ca || !cb) return ca == cb;
        if (ca.tagName != cb.tagName) return false;
      }
    },

    electricChars: "/"
  };
});

CodeMirror.defineMIME("application/xml", "xml");
if (!CodeMirror.mimeModes.hasOwnProperty("text/html"))
  CodeMirror.defineMIME("text/html", {name: "xml", htmlMode: true});
;
CodeMirror.defineMode("javascript", function(config, parserConfig) {
  var indentUnit = config.indentUnit;
  var jsonMode = parserConfig.json;

  // Tokenizer

  var keywords = function(){
    function kw(type) {return {type: type, style: "keyword"};}
    var A = kw("keyword a"), B = kw("keyword b"), C = kw("keyword c");
    var operator = kw("operator"), atom = {type: "atom", style: "atom"};
    return {
      "if": A, "while": A, "with": A, "else": B, "do": B, "try": B, "finally": B,
      "return": C, "break": C, "continue": C, "new": C, "delete": C, "throw": C,
      "var": kw("var"), "const": kw("var"), "let": kw("var"),
      "function": kw("function"), "catch": kw("catch"),
      "for": kw("for"), "switch": kw("switch"), "case": kw("case"), "default": kw("default"),
      "in": operator, "typeof": operator, "instanceof": operator,
      "true": atom, "false": atom, "null": atom, "undefined": atom, "NaN": atom, "Infinity": atom
    };
  }();

  var isOperatorChar = /[+\-*&%=<>!?|]/;

  function chain(stream, state, f) {
    state.tokenize = f;
    return f(stream, state);
  }

  function nextUntilUnescaped(stream, end) {
    var escaped = false, next;
    while ((next = stream.next()) != null) {
      if (next == end && !escaped)
        return false;
      escaped = !escaped && next == "\\";
    }
    return escaped;
  }

  // Used as scratch variables to communicate multiple values without
  // consing up tons of objects.
  var type, content;
  function ret(tp, style, cont) {
    type = tp; content = cont;
    return style;
  }

  function jsTokenBase(stream, state) {
    var ch = stream.next();
    if (ch == '"' || ch == "'")
      return chain(stream, state, jsTokenString(ch));
    else if (/[\[\]{}\(\),;\:\.]/.test(ch))
      return ret(ch);
    else if (ch == "0" && stream.eat(/x/i)) {
      stream.eatWhile(/[\da-f]/i);
      return ret("number", "number");
    }      
    else if (/\d/.test(ch) || ch == "-" && stream.eat(/\d/)) {
      stream.match(/^\d*(?:\.\d*)?(?:[eE][+\-]?\d+)?/);
      return ret("number", "number");
    }
    else if (ch == "/") {
      if (stream.eat("*")) {
        return chain(stream, state, jsTokenComment);
      }
      else if (stream.eat("/")) {
        stream.skipToEnd();
        return ret("comment", "comment");
      }
      else if (state.reAllowed) {
        nextUntilUnescaped(stream, "/");
        stream.eatWhile(/[gimy]/); // 'y' is "sticky" option in Mozilla
        return ret("regexp", "string-2");
      }
      else {
        stream.eatWhile(isOperatorChar);
        return ret("operator", null, stream.current());
      }
    }
    else if (ch == "#") {
        stream.skipToEnd();
        return ret("error", "error");
    }
    else if (isOperatorChar.test(ch)) {
      stream.eatWhile(isOperatorChar);
      return ret("operator", null, stream.current());
    }
    else {
      stream.eatWhile(/[\w\$_]/);
      var word = stream.current(), known = keywords.propertyIsEnumerable(word) && keywords[word];
      return (known && state.kwAllowed) ? ret(known.type, known.style, word) :
                     ret("variable", "variable", word);
    }
  }

  function jsTokenString(quote) {
    return function(stream, state) {
      if (!nextUntilUnescaped(stream, quote))
        state.tokenize = jsTokenBase;
      return ret("string", "string");
    };
  }

  function jsTokenComment(stream, state) {
    var maybeEnd = false, ch;
    while (ch = stream.next()) {
      if (ch == "/" && maybeEnd) {
        state.tokenize = jsTokenBase;
        break;
      }
      maybeEnd = (ch == "*");
    }
    return ret("comment", "comment");
  }

  // Parser

  var atomicTypes = {"atom": true, "number": true, "variable": true, "string": true, "regexp": true};

  function JSLexical(indented, column, type, align, prev, info) {
    this.indented = indented;
    this.column = column;
    this.type = type;
    this.prev = prev;
    this.info = info;
    if (align != null) this.align = align;
  }

  function inScope(state, varname) {
    for (var v = state.localVars; v; v = v.next)
      if (v.name == varname) return true;
  }

  function parseJS(state, style, type, content, stream) {
    var cc = state.cc;
    // Communicate our context to the combinators.
    // (Less wasteful than consing up a hundred closures on every call.)
    cx.state = state; cx.stream = stream; cx.marked = null, cx.cc = cc;
  
    if (!state.lexical.hasOwnProperty("align"))
      state.lexical.align = true;

    while(true) {
      var combinator = cc.length ? cc.pop() : jsonMode ? expression : statement;
      if (combinator(type, content)) {
        while(cc.length && cc[cc.length - 1].lex)
          cc.pop()();
        if (cx.marked) return cx.marked;
        if (type == "variable" && inScope(state, content)) return "variable-2";
        return style;
      }
    }
  }

  // Combinator utils

  var cx = {state: null, column: null, marked: null, cc: null};
  function pass() {
    for (var i = arguments.length - 1; i >= 0; i--) cx.cc.push(arguments[i]);
  }
  function cont() {
    pass.apply(null, arguments);
    return true;
  }
  function register(varname) {
    var state = cx.state;
    if (state.context) {
      cx.marked = "def";
      for (var v = state.localVars; v; v = v.next)
        if (v.name == varname) return;
      state.localVars = {name: varname, next: state.localVars};
    }
  }

  // Combinators

  var defaultVars = {name: "this", next: {name: "arguments"}};
  function pushcontext() {
    if (!cx.state.context) cx.state.localVars = defaultVars;
    cx.state.context = {prev: cx.state.context, vars: cx.state.localVars};
  }
  function popcontext() {
    cx.state.localVars = cx.state.context.vars;
    cx.state.context = cx.state.context.prev;
  }
  function pushlex(type, info) {
    var result = function() {
      var state = cx.state;
      state.lexical = new JSLexical(state.indented, cx.stream.column(), type, null, state.lexical, info)
    };
    result.lex = true;
    return result;
  }
  function poplex() {
    var state = cx.state;
    if (state.lexical.prev) {
      if (state.lexical.type == ")")
        state.indented = state.lexical.indented;
      state.lexical = state.lexical.prev;
    }
  }
  poplex.lex = true;

  function expect(wanted) {
    return function expecting(type) {
      if (type == wanted) return cont();
      else if (wanted == ";") return pass();
      else return cont(arguments.callee);
    };
  }

  function statement(type) {
    if (type == "var") return cont(pushlex("vardef"), vardef1, expect(";"), poplex);
    if (type == "keyword a") return cont(pushlex("form"), expression, statement, poplex);
    if (type == "keyword b") return cont(pushlex("form"), statement, poplex);
    if (type == "{") return cont(pushlex("}"), block, poplex);
    if (type == ";") return cont();
    if (type == "function") return cont(functiondef);
    if (type == "for") return cont(pushlex("form"), expect("("), pushlex(")"), forspec1, expect(")"),
                                      poplex, statement, poplex);
    if (type == "variable") return cont(pushlex("stat"), maybelabel);
    if (type == "switch") return cont(pushlex("form"), expression, pushlex("}", "switch"), expect("{"),
                                         block, poplex, poplex);
    if (type == "case") return cont(expression, expect(":"));
    if (type == "default") return cont(expect(":"));
    if (type == "catch") return cont(pushlex("form"), pushcontext, expect("("), funarg, expect(")"),
                                        statement, poplex, popcontext);
    return pass(pushlex("stat"), expression, expect(";"), poplex);
  }
  function expression(type) {
    if (atomicTypes.hasOwnProperty(type)) return cont(maybeoperator);
    if (type == "function") return cont(functiondef);
    if (type == "keyword c") return cont(maybeexpression);
    if (type == "(") return cont(pushlex(")"), maybeexpression, expect(")"), poplex, maybeoperator);
    if (type == "operator") return cont(expression);
    if (type == "[") return cont(pushlex("]"), commasep(expression, "]"), poplex, maybeoperator);
    if (type == "{") return cont(pushlex("}"), commasep(objprop, "}"), poplex, maybeoperator);
    return cont();
  }
  function maybeexpression(type) {
    if (type.match(/[;\}\)\],]/)) return pass();
    return pass(expression);
  }
    
  function maybeoperator(type, value) {
    if (type == "operator" && /\+\+|--/.test(value)) return cont(maybeoperator);
    if (type == "operator" || type == ":") return cont(expression);
    if (type == ";") return;
    if (type == "(") return cont(pushlex(")"), commasep(expression, ")"), poplex, maybeoperator);
    if (type == ".") return cont(property, maybeoperator);
    if (type == "[") return cont(pushlex("]"), expression, expect("]"), poplex, maybeoperator);
  }
  function maybelabel(type) {
    if (type == ":") return cont(poplex, statement);
    return pass(maybeoperator, expect(";"), poplex);
  }
  function property(type) {
    if (type == "variable") {cx.marked = "property"; return cont();}
  }
  function objprop(type) {
    if (type == "variable") cx.marked = "property";
    if (atomicTypes.hasOwnProperty(type)) return cont(expect(":"), expression);
  }
  function commasep(what, end) {
    function proceed(type) {
      if (type == ",") return cont(what, proceed);
      if (type == end) return cont();
      return cont(expect(end));
    }
    return function commaSeparated(type) {
      if (type == end) return cont();
      else return pass(what, proceed);
    };
  }
  function block(type) {
    if (type == "}") return cont();
    return pass(statement, block);
  }
  function vardef1(type, value) {
    if (type == "variable"){register(value); return cont(vardef2);}
    return cont();
  }
  function vardef2(type, value) {
    if (value == "=") return cont(expression, vardef2);
    if (type == ",") return cont(vardef1);
  }
  function forspec1(type) {
    if (type == "var") return cont(vardef1, forspec2);
    if (type == ";") return pass(forspec2);
    if (type == "variable") return cont(formaybein);
    return pass(forspec2);
  }
  function formaybein(type, value) {
    if (value == "in") return cont(expression);
    return cont(maybeoperator, forspec2);
  }
  function forspec2(type, value) {
    if (type == ";") return cont(forspec3);
    if (value == "in") return cont(expression);
    return cont(expression, expect(";"), forspec3);
  }
  function forspec3(type) {
    if (type != ")") cont(expression);
  }
  function functiondef(type, value) {
    if (type == "variable") {register(value); return cont(functiondef);}
    if (type == "(") return cont(pushlex(")"), pushcontext, commasep(funarg, ")"), poplex, statement, popcontext);
  }
  function funarg(type, value) {
    if (type == "variable") {register(value); return cont();}
  }

  // Interface

  return {
    startState: function(basecolumn) {
      return {
        tokenize: jsTokenBase,
        reAllowed: true,
        kwAllowed: true,
        cc: [],
        lexical: new JSLexical((basecolumn || 0) - indentUnit, 0, "block", false),
        localVars: parserConfig.localVars,
        context: parserConfig.localVars && {vars: parserConfig.localVars},
        indented: 0
      };
    },

    token: function(stream, state) {
      if (stream.sol()) {
        if (!state.lexical.hasOwnProperty("align"))
          state.lexical.align = false;
        state.indented = stream.indentation();
      }
      if (stream.eatSpace()) return null;
      var style = state.tokenize(stream, state);
      if (type == "comment") return style;
      state.reAllowed = !!(type == "operator" || type == "keyword c" || type.match(/^[\[{}\(,;:]$/));
      state.kwAllowed = type != '.';
      return parseJS(state, style, type, content, stream);
    },

    indent: function(state, textAfter) {
      if (state.tokenize != jsTokenBase) return 0;
      var firstChar = textAfter && textAfter.charAt(0), lexical = state.lexical;
      if (lexical.type == "stat" && firstChar == "}") lexical = lexical.prev;
      var type = lexical.type, closing = firstChar == type;
      if (type == "vardef") return lexical.indented + 4;
      else if (type == "form" && firstChar == "{") return lexical.indented;
      else if (type == "stat" || type == "form") return lexical.indented + indentUnit;
      else if (lexical.info == "switch" && !closing)
        return lexical.indented + (/^(?:case|default)\b/.test(textAfter) ? indentUnit : 2 * indentUnit);
      else if (lexical.align) return lexical.column + (closing ? 0 : 1);
      else return lexical.indented + (closing ? 0 : indentUnit);
    },

    electricChars: ":{}"
  };
});

CodeMirror.defineMIME("text/javascript", "javascript");
CodeMirror.defineMIME("application/json", {name: "javascript", json: true});
;
CodeMirror.defineMode("css", function(config) {
  var indentUnit = config.indentUnit, type;
  function ret(style, tp) {type = tp; return style;}

  function tokenBase(stream, state) {
    var ch = stream.next();
    if (ch == "@") {stream.eatWhile(/[\w\\\-]/); return ret("meta", stream.current());}
    else if (ch == "/" && stream.eat("*")) {
      state.tokenize = tokenCComment;
      return tokenCComment(stream, state);
    }
    else if (ch == "<" && stream.eat("!")) {
      state.tokenize = tokenSGMLComment;
      return tokenSGMLComment(stream, state);
    }
    else if (ch == "=") ret(null, "compare");
    else if ((ch == "~" || ch == "|") && stream.eat("=")) return ret(null, "compare");
    else if (ch == "\"" || ch == "'") {
      state.tokenize = tokenString(ch);
      return state.tokenize(stream, state);
    }
    else if (ch == "#") {
      stream.eatWhile(/[\w\\\-]/);
      return ret("atom", "hash");
    }
    else if (ch == "!") {
      stream.match(/^\s*\w*/);
      return ret("keyword", "important");
    }
    else if (/\d/.test(ch)) {
      stream.eatWhile(/[\w.%]/);
      return ret("number", "unit");
    }
    else if (/[,.+>*\/]/.test(ch)) {
      return ret(null, "select-op");
    }
    else if (/[;{}:\[\]]/.test(ch)) {
      return ret(null, ch);
    }
    else {
      stream.eatWhile(/[\w\\\-]/);
      return ret("variable", "variable");
    }
  }

  function tokenCComment(stream, state) {
    var maybeEnd = false, ch;
    while ((ch = stream.next()) != null) {
      if (maybeEnd && ch == "/") {
        state.tokenize = tokenBase;
        break;
      }
      maybeEnd = (ch == "*");
    }
    return ret("comment", "comment");
  }

  function tokenSGMLComment(stream, state) {
    var dashes = 0, ch;
    while ((ch = stream.next()) != null) {
      if (dashes >= 2 && ch == ">") {
        state.tokenize = tokenBase;
        break;
      }
      dashes = (ch == "-") ? dashes + 1 : 0;
    }
    return ret("comment", "comment");
  }

  function tokenString(quote) {
    return function(stream, state) {
      var escaped = false, ch;
      while ((ch = stream.next()) != null) {
        if (ch == quote && !escaped)
          break;
        escaped = !escaped && ch == "\\";
      }
      if (!escaped) state.tokenize = tokenBase;
      return ret("string", "string");
    };
  }

  return {
    startState: function(base) {
      return {tokenize: tokenBase,
              baseIndent: base || 0,
              stack: []};
    },

    token: function(stream, state) {
      if (stream.eatSpace()) return null;
      var style = state.tokenize(stream, state);

      var context = state.stack[state.stack.length-1];
      if (type == "hash" && context != "rule") style = "string-2";
      else if (style == "variable") {
        if (context == "rule") style = "number";
        else if (!context || context == "@media{") style = "tag";
      }

      if (context == "rule" && /^[\{\};]$/.test(type))
        state.stack.pop();
      if (type == "{") {
        if (context == "@media") state.stack[state.stack.length-1] = "@media{";
        else state.stack.push("{");
      }
      else if (type == "}") state.stack.pop();
      else if (type == "@media") state.stack.push("@media");
      else if (context == "{" && type != "comment") state.stack.push("rule");
      return style;
    },

    indent: function(state, textAfter) {
      var n = state.stack.length;
      if (/^\}/.test(textAfter))
        n -= state.stack[state.stack.length-1] == "rule" ? 2 : 1;
      return state.baseIndent + n * indentUnit;
    },

    electricChars: "}"
  };
});

CodeMirror.defineMIME("text/css", "css");
;
CodeMirror.defineMode("htmlmixed", function(config, parserConfig) {
  var htmlMode = CodeMirror.getMode(config, {name: "xml", htmlMode: true});
  var jsMode = CodeMirror.getMode(config, "javascript");
  var cssMode = CodeMirror.getMode(config, "css");

  function html(stream, state) {
    var style = htmlMode.token(stream, state.htmlState);
    if (style == "tag" && stream.current() == ">" && state.htmlState.context) {
      if (/^script$/i.test(state.htmlState.context.tagName)) {
        state.token = javascript;
        state.localState = jsMode.startState(htmlMode.indent(state.htmlState, ""));
        state.mode = "javascript";
      }
      else if (/^style$/i.test(state.htmlState.context.tagName)) {
        state.token = css;
        state.localState = cssMode.startState(htmlMode.indent(state.htmlState, ""));
        state.mode = "css";
      }
    }
    return style;
  }
  function maybeBackup(stream, pat, style) {
    var cur = stream.current();
    var close = cur.search(pat);
    if (close > -1) stream.backUp(cur.length - close);
    return style;
  }
  function javascript(stream, state) {
    if (stream.match(/^<\/\s*script\s*>/i, false)) {
      state.token = html;
      state.localState = null;
      state.mode = "html";
      return html(stream, state);
    }
    return maybeBackup(stream, /<\/\s*script\s*>/,
                       jsMode.token(stream, state.localState));
  }
  function css(stream, state) {
    if (stream.match(/^<\/\s*style\s*>/i, false)) {
      state.token = html;
      state.localState = null;
      state.mode = "html";
      return html(stream, state);
    }
    return maybeBackup(stream, /<\/\s*style\s*>/,
                       cssMode.token(stream, state.localState));
  }

  return {
    startState: function() {
      var state = htmlMode.startState();
      return {token: html, localState: null, mode: "html", htmlState: state};
    },

    copyState: function(state) {
      if (state.localState)
        var local = CodeMirror.copyState(state.token == css ? cssMode : jsMode, state.localState);
      return {token: state.token, localState: local, mode: state.mode,
              htmlState: CodeMirror.copyState(htmlMode, state.htmlState)};
    },

    token: function(stream, state) {
      return state.token(stream, state);
    },

    indent: function(state, textAfter) {
      if (state.token == html || /^\s*<\//.test(textAfter))
        return htmlMode.indent(state.htmlState, textAfter);
      else if (state.token == javascript)
        return jsMode.indent(state.localState, textAfter);
      else
        return cssMode.indent(state.localState, textAfter);
    },

    compareStates: function(a, b) {
      if (a.mode != b.mode) return false;
      if (a.localState) return CodeMirror.Pass;
      return htmlMode.compareStates(a.htmlState, b.htmlState);
    },

    electricChars: "/{}:"
  }
}, "xml", "javascript", "css");

CodeMirror.defineMIME("text/html", "htmlmixed");
;
function eli18n(a){this.textdomain=function(b){return this.messages[b]?this._domain=b:this._domain};a&&a.messages&&this.load(a.messages);a&&a.textdomain&&this.textdomain(a.textdomain)}eli18n.prototype=new function(){this.messages={};this._domain="";this.load=function(c){if(typeof(c)=="object"){for(var f in c){var b=c[f];if(typeof(b)=="object"){if(!this.messages[f]){this.messages[f]={}}for(var a in b){if(typeof(b[a])=="string"){this.messages[f][a]=b[a]}}}}}return this};this.translate=function(b,a){var a=a&&this.messages[a]?a:this._domain;
return this.messages[a]&&this.messages[a][b]?this.messages[a][b]:b};this.format=function(f,b,c){f=this.translate(f,c);if(typeof(b)=="object"){for(var a in b){f=f.replace("%"+a,this.translate(b[a],c))}}return f}};function elDialogForm(c){var a=this;var b={"class":"el-dialogform",submit:function(f,g){g.close()},form:{action:window.location.href,method:"post"},ajaxForm:null,validate:null,spinner:"Loading",tabs:{active:0,selected:0},tabPrefix:"el-df-tab-",dialog:{title:"dialog",autoOpen:false,modal:true,resizable:false,closeOnEscape:true,buttons:{Cancel:function(){a.close()
},Ok:function(){a.form.trigger("submit")}}}};this.opts=jQuery.extend(true,{},b,c);this.opts.dialog.close=function(){a.close()};if(this.opts.rtl){this.opts["class"]+=" el-dialogform-rtl"}if(c&&c.dialog&&c.dialog.buttons&&typeof(c.dialog.buttons)=="object"){this.opts.dialog.buttons=c.dialog.buttons}this.ul=null;this.tabs={};this._table=null;this.dialog=jQuery("<div />").addClass(this.opts["class"]).dialog(this.opts.dialog);this.message=jQuery('<div class="el-dialogform-message rounded-5" />').hide().appendTo(this.dialog);
this.error=jQuery('<div class="el-dialogform-error rounded-5" />').hide().appendTo(this.dialog);this.spinner=jQuery('<div class="spinner" />').hide().appendTo(this.dialog);this.content=jQuery('<div class="el-dialogform-content" />').appendTo(this.dialog);this.form=jQuery("<form />").attr(this.opts.form).appendTo(this.content);if(this.opts.submit){this.form.bind("submit",function(f){a.opts.submit(f,a)})}if(this.opts.ajaxForm&&jQuery.fn.ajaxForm){this.form.ajaxForm(this.opts.ajaxForm)}if(this.opts.validate){this.form.validate(this.opts.validate)
}this.option=function(f,g){return this.dialog.dialog("option",f,g)};this.showError=function(f,g){this.hideMessage();this.hideSpinner();this.error.html(f).show();g&&this.content.hide();return this};this.hideError=function(){this.error.text("").hide();this.content.show();return this};this.showSpinner=function(f){this.error.hide();this.message.hide();this.content.hide();this.spinner.text(f||this.opts.spinner).show();this.option("buttons",{});return this};this.hideSpinner=function(){this.content.show();
this.spinner.hide();return this};this.showMessage=function(f,g){this.hideError();this.hideSpinner();this.message.html(f||"").show();g&&this.content.hide();return this};this.hideMessage=function(){this.message.hide();this.content.show();return this};this.tab=function(g,f){g=this.opts.tabPrefix+g;if(!this.ul){this.ul=jQuery("<ul />").prependTo(this.form)}jQuery("<li />").append(jQuery("<a />").attr("href","#"+g).html(f)).appendTo(this.ul);this.tabs[g]={tab:jQuery("<div />").attr("id",g).addClass("tab").appendTo(this.form),table:null};
return this};this.table=function(f){f=f&&f.indexOf(this.opts.tabPrefix)==-1?this.opts.tabPrefix+f:f;if(f&&this.tabs&&this.tabs[f]){this.tabs[f].table=jQuery("<table />").appendTo(this.tabs[f].tab)}else{this._table=jQuery("<table />").appendTo(this.form)}return this};this.append=function(j,k,g){k=k?"el-df-tab-"+k:"";if(!j){return this}if(k&&this.tabs[k]){if(g){!this.tabs[k].table&&this.table(k);var h=jQuery("<tr />").appendTo(this.tabs[k].table);if(!jQuery.isArray(j)){h.append(jQuery("<td />").append(j))
}else{for(var f=0;f<j.length;f++){h.append(jQuery("<td />").append(j[f]))}}}else{if(!jQuery.isArray(j)){this.tabs[k].tab.append(j)}else{for(var f=0;f<j.length;f++){this.tabs[k].tab.append(j[f])}}}}else{if(!g){if(!jQuery.isArray(j)){this.form.append(j)}else{for(var f=0;f<j.length;f++){this.form.append(j[f])}}}else{if(!this._table){this.table()}var h=jQuery("<tr />").appendTo(this._table);if(!jQuery.isArray(j)){h.append(jQuery("<td />").append(j))}else{for(var f=0;f<j.length;f++){h.append(jQuery("<td />").append(j[f]))
}}}}return this};this.separator=function(f){f="el-df-tab-"+f;if(this.tabs&&this.tabs[f]){this.tabs[f].tab.append(jQuery("<div />").addClass("separator"));this.tabs[f].table&&this.table(f)}else{this.form.append(jQuery("<div />").addClass("separator"))}return this};this.open=function(){var f=this;this.ul&&this.form.tabs(this.opts.tabs);setTimeout(function(){f.dialog.find(":text").keydown(function(g){if(g.keyCode==13){g.preventDefault();f.form.submit()}}).filter(":first")[0].focus()},200);this.dialog.dialog("open");
return this};this.close=function(){if(typeof(this.opts.close)=="function"){this.opts.close()}this.dialog.dialog("destroy")}}(function(a){a.fn.elColorPicker=function(h){var b=this;var f=a.extend({},a.fn.elColorPicker.defaults,h);this.hidden=a('<input type="hidden" />').attr("name",f.name).val(f.color||"").appendTo(this);this.palette=null;this.preview=null;this.input=null;function c(j){b.val(j);f.change&&f.change(b.val());b.palette.slideUp()}function g(){b.palette=a("<div />").addClass(f.paletteClass+" rounded-3");
for(var j=0;j<f.colors.length;j++){a("<div />").addClass("color").css("background-color",f.colors[j]).attr({title:f.colors[j],unselectable:"on"}).appendTo(b.palette).mouseenter(function(){var k=a(this).attr("title");b.input.val(k);b.preview.css("background-color",k)}).click(function(k){k.stopPropagation();c(a(this).attr("title"))})}b.input=a('<input type="text" />').addClass("rounded-3").attr("size",8).click(function(k){k.stopPropagation();a(this).focus()}).keydown(function(p){if(p.ctrlKey||p.metaKey){return true
}var o=p.keyCode;if(o==27){return b.mouseleave()}if(o!=8&&o!=13&&o!=46&&o!=37&&o!=39&&(o<48||o>57)&&(o<65||o>70)){return false}var q=a(this).val();if(q.length==7||q.length==0){if(o==13){p.stopPropagation();p.preventDefault();c(q);b.palette.slideUp()}if(p.keyCode!=8&&p.keyCode!=46&&o!=37&&o!=39){return false}}}).keyup(function(k){var o=a(this).val();o.length==7&&/^#[0-9abcdef]{6}$/i.test(o)&&b.val(o)});b.preview=a("<div />").addClass("preview rounded-3").click(function(k){k.stopPropagation();c(b.input.val())
});b.palette.append(a("<div />").addClass("clearfix")).append(a("<div />").addClass("panel").append(b.input).append(b.preview));if(f.palettePosition=="outer"){b.palette.hide().appendTo(b.parents("body").eq(0)).mouseleave(function(){if(!b.palette.is(":animated")){a(this).slideUp();b.val(b.val())}});b.mouseleave(function(k){if(k.relatedTarget!=b.palette.get(0)){if(!b.palette.is(":animated")){b.palette.slideUp();b.val(b.val())}}})}else{b.append(b.palette.hide()).mouseleave(function(k){b.palette.slideUp();
b.val(b.val())})}b.val(b.val())}this.empty().addClass(f["class"]+" rounded-3").css({position:"relative","background-color":f.color||""}).click(function(p){if(!b.hasClass("disabled")){!b.palette&&g();if(f.palettePosition=="outer"&&b.palette.css("display")=="none"){var q=a(this).offset();var k=b.palette.width();var j=b.parents("body").width()-q.left>=k?q.left:q.left+a(this).outerWidth()-k;b.palette.css({left:j+"px",top:q.top+a(this).height()+1+"px"})}b.palette.slideToggle()}});this.val=function(j){if(!j&&j!==""){return this.hidden.val()
}else{this.hidden.val(j);if(f.update){f.update(this.hidden.val())}else{this.css("background-color",j)}if(b.palette){b.preview.css("background-color",j);b.input.val(j)}}return this};return this};a.fn.elColorPicker.defaults={"class":"el-colorpicker",paletteClass:"el-palette",palettePosition:"inner",name:"color",color:"",update:null,change:function(b){},colors:["#ffffff","#cccccc","#999999","#666666","#333333","#000000","#ffcccc","#cc9999","#996666","#663333","#330000","#ff9999","#cc6666","#cc3333","#993333","#660000","#ff6666","#ff3333","#ff0000","#cc0000","#990000","#ff9966","#ff6633","#ff3300","#cc3300","#993300","#ffcc99","#cc9966","#cc6633","#996633","#663300","#ff9933","#ff6600","#ff9900","#cc6600","#cc9933","#ffcc66","#ffcc33","#ffcc00","#cc9900","#996600","#ffffcc","#cccc99","#999966","#666633","#333300","#ffff99","#cccc66","#cccc33","#999933","#666600","#ffff66","#ffff33","#ffff00","#cccc00","#999900","#ccff66","#ccff33","#ccff00","#99cc00","#669900","#ccff99","#99cc66","#99cc33","#669933","#336600","#99ff33","#99ff00","#66ff00","#66cc00","#66cc33","#99ff66","#66ff33","#33ff00","#33cc00","#339900","#ccffcc","#99cc99","#669966","#336633","#003300","#99ff99","#66cc66","#33cc33","#339933","#006600","#66ff66","#33ff33","#00ff00","#00cc00","#009900","#66ff99","#33ff66","#00ff33","#00cc33","#009933","#99ffcc","#66cc99","#33cc66","#339966","#006633","#33ff99","#00ff66","#00ff99","#00cc66","#33cc99","#66ffcc","#33ffcc","#00ffcc","#00cc99","#009966","#ccffff","#99cccc","#669999","#336666","#003333","#99ffff","#66cccc","#33cccc","#339999","#006666","#66cccc","#33ffff","#00ffff","#00cccc","#009999","#66ccff","#33ccff","#00ccff","#0099cc","#006699","#99ccff","#6699cc","#3399cc","#336699","#003366","#3399ff","#0099ff","#0066ff","#066ccc","#3366cc","#6699ff","#3366ff","#0033ff","#0033cc","#003399","#ccccff","#9999cc","#666699","#333366","#000033","#9999ff","#6666cc","#3333cc","#333399","#000066","#6666ff","#3333ff","#0000ff","#0000cc","#009999","#9966ff","#6633ff","#3300ff","#3300cc","#330099","#cc99ff","#9966cc","#6633cc","#663399","#330066","#9933ff","#6600ff","#9900ff","#6600cc","#9933cc","#cc66ff","#cc33ff","#cc00ff","#9900cc","#660099","#ffccff","#cc99cc","#996699","#663366","#330033","#ff99ff","#cc66cc","#cc33cc","#993399","#660066","#ff66ff","#ff33ff","#ff00ff","#cc00cc","#990099","#ff66cc","#ff33cc","#ff00cc","#cc0099","#990066","#ff99cc","#cc6699","#cc3399","#993366","#660033","#ff3399","#ff0099","#ff0066","#cc0066","#cc3366","#ff6699","#ff3366","#ff0033","#cc0033","#990033"]}
})(jQuery);(function(a){a.fn.elBorderSelect=function(h){var k=this;var q=this.eq(0);var b=a.extend({},a.fn.elBorderSelect.defaults,h);var f=a('<input type="text" />').attr({name:b.name+"[width]",size:3}).css("text-align","right").change(function(){k.change()});var j=a("<div />").css("position","relative").elColorPicker({"class":"el-colorpicker ui-icon ui-icon-pencil",name:b.name+"[color]",palettePosition:"outer",change:function(){k.change()}});var c=a("<div />").elSelect({tpl:'<div style="border-bottom:4px %val #000;width:100%;margin:7px 0"> </div>',tpls:{"":"%label"},maxHeight:b.styleHeight||null,select:function(){k.change()
},src:{"":"none",solid:"solid",dashed:"dashed",dotted:"dotted","double":"double",groove:"groove",ridge:"ridge",inset:"inset",outset:"outset"}});q.empty().addClass(b["class"]).attr("name",b.name||"").append(a("<table />").attr("cellspacing",0).append(a("<tr />").append(a("<td />").append(f).append(" px")).append(a("<td />").append(c)).append(a("<td />").append(j))));function g(t){function r(u){hexDigits=["0","1","2","3","4","5","6","7","8","9","a","b","c","d","e","f"];return !u?"00":hexDigits[(u-u%16)/16]+hexDigits[u%16]
}var o=(t||"").match(/\(([0-9]{1,3}),\s*([0-9]{1,3}),\s*([0-9]{1,3})\)/);return o?"#"+r(o[1])+r(o[2])+r(o[3]):""}function p(r){if(!r){return r}var o=r.match(/([0-9]+\.?[0-9]*)\s*(px|pt|em|%)/);if(o){r=o[1];unit=o[2]}if(r[0]=="."){r="0"+r}r=parseFloat(r);if(isNaN(r)){return""}var t=parseInt(a(document.body).css("font-size"))||16;switch(unit){case"em":return parseInt(r*t);case"pt":return parseInt(r*t/12);case"%":return parseInt(r*t/100)}return r}this.change=function(){b.change&&b.change(this.val())
};this.val=function(u){var t,x,z,r,o;if(!u&&u!==""){t=parseInt(f.val());t=!isNaN(t)?t+"px":"";x=c.val();z=j.val();return{width:t,style:x,color:z,css:a.trim(t+" "+x+" "+z)}}else{r="";if(u.nodeName||u.css){if(!u.css){u=a(u)}r=u.css("border");if((r=u.css("border"))){t=x=z=r}else{t=u.css("border-width");x=u.css("border-style");z=u.css("border-color")}}else{t=u.width||"";x=u.style||"";z=u.color||""}f.val(p(t));o=x?x.match(/(solid|dashed|dotted|double|groove|ridge|inset|outset)/i):"";c.val(o?o[1]:"");j.val(z.indexOf("#")===0?z:g(z));
return this}};this.val(b.value);return this};a.fn.elBorderSelect.defaults={name:"el-borderselect","class":"el-borderselect",value:{},change:null}})(jQuery);(function(a){a.fn.elPaddingInput=function(g){var c=this;var f=a.extend({},a.fn.elPaddingInput.defaults,{name:this.attr("name")},g);this.regexps={main:new RegExp(f.type=="padding"?'paddings*:s*([^;"]+)':'margins*:s*([^;"]+)',"im"),left:new RegExp(f.type=="padding"?'padding-lefts*:s*([^;"]+)':'margin-lefts*:s*([^;"]+)',"im"),top:new RegExp(f.type=="padding"?'padding-tops*:s*([^;"]+)':'margin-tops*:s*([^;"]+)',"im"),right:new RegExp(f.type=="padding"?'padding-rights*:s*([^;"]+)':'margin-rights*:s*([^;"]+)',"im"),bottom:new RegExp(f.type=="padding"?'padding-bottoms*:s*([^;"]+)':'margin-bottoms*:s*([^;"]+)',"im")};
a.each(["left","top","right","bottom"],function(){c[this]=a('<input type="text" />').attr("size",3).css("text-align","right").css("border-"+this,"2px solid red").bind("change",function(){a(this).val(b(a(this).val()));h()}).attr("name",f.name+"["+this+"]")});a.each(["uleft","utop","uright","ubottom"],function(){c[this]=a("<select />").append('<option value="px">px</option>').append('<option value="em">em</option>').append('<option value="pt">pt</option>').bind("change",function(){h()}).attr("name",f.name+"["+this+"]");
if(f.percents){c[this].append('<option value="%">%</option>')}});this.empty().addClass(f["class"]).append(this.left).append(this.uleft).append(" x ").append(this.top).append(this.utop).append(" x ").append(this.right).append(this.uright).append(" x ").append(this.bottom).append(this.ubottom);this.val=function(z){if(!z&&z!==""){var q=b(this.left.val());var A=b(this.top.val());var j=b(this.right.val());var x=b(this.bottom.val());var w={left:q=="auto"||q==0?q:(q!==""?q+this.uleft.val():""),top:A=="auto"||A==0?A:(A!==""?A+this.utop.val():""),right:j=="auto"||j==0?j:(j!==""?j+this.uright.val():""),bottom:x=="auto"||x==0?x:(x!==""?x+this.ubottom.val():""),css:""};
if(w.left!==""&&w.right!==""&&w.top!==""&&w.bottom!==""){if(w.left==w.right&&w.top==w.bottom){w.css=w.top+" "+w.left}else{w.css=w.top+" "+w.right+" "+w.bottom+" "+w.left}}return w}else{if(z.nodeName||z.css){if(!z.css){z=a(z)}var o={left:"",top:"",right:"",bottom:""};var k=(z.attr("style")||"").toLowerCase();if(k){k=a.trim(k);var p=k.match(this.regexps.main);if(p){var u=a.trim(p[1]).replace(/\s+/g," ").split(" ",4);o.top=u[0];o.right=u[1]&&u[1]!==""?u[1]:o.top;o.bottom=u[2]&&u[2]!==""?u[2]:o.top;o.left=u[3]&&u[3]!==""?u[3]:o.right
}else{a.each(["left","top","right","bottom"],function(){var r=this.toString();p=k.match(c.regexps[r]);if(p){o[r]=p[1]}})}}var z=o}a.each(["left","top","right","bottom"],function(){var t=this.toString();c[t].val("");c["u"+t].val();if(typeof(z[t])!="undefined"&&z[t]!==null){z[t]=z[t].toString();var v=b(z[t]);c[t].val(v);var r=z[t].match(/(px|em|pt|%)/i);c["u"+t].val(r?r[1]:"px")}});return this}};function b(j){j=a.trim(j.toString());if(j[0]=="."){j="0"+j}n=parseFloat(j);return !isNaN(n)?n:(j=="auto"?j:"")
}function h(){f.change&&f.change(c)}this.val(f.value);return this};a.fn.elPaddingInput.defaults={name:"el-paddinginput","class":"el-paddinginput",type:"padding",value:{},percents:true,change:null}})(jQuery);(function(a){a.fn.elSelect=function(c){var q=this;var u=this.eq(0);var b=a.extend({},a.fn.elSelect.defaults,c);var g=a('<input type="hidden" />').attr("name",b.name);var p=a("<label />").attr({unselectable:"on"}).addClass("rounded-left-3");var h=null;var k=null;if(u.get(0).nodeName=="SELECT"){b.src={};
u.children("option").each(function(){b.src[a(this).val()]=a(this).text()});b.value=u.val();b.name=u.attr("name");u.replaceWith((u=a("<div />")))}if(!b.value||!b.src[b.val]){b.value=null;var f=0;for(var r in b.src){if(f++==0){b.value=r}}}this.val=function(o){if(!o&&o!==""){return g.val()}else{if(b.src[o]){g.val(o);j(o);if(h){h.children().each(function(){if(a(this).attr("name")==o){a(this).addClass("active")}else{a(this).removeClass("active")}})}}return this}};function j(o){var w=b.labelTpl||b.tpls[o]||b.tpl;
p.html(w.replace(/%val/g,o).replace(/%label/,b.src[o])).children().attr({unselectable:"on"})}u.empty().addClass(b["class"]+" rounded-3").attr({unselectable:"on"}).append(g).append(p).hover(function(){a(this).addClass("hover")},function(){a(this).removeClass("hover")}).click(function(o){!h&&t();h.slideToggle();if(a.browser.msie&&!k){h.children().each(function(){k=Math.max(k,a(this).width())});if(k>h.width()){h.width(k+40)}}});this.val(b.value);function t(){h=a("<div />").addClass(b.listClass+" rounded-3").hide().appendTo(u.mouseleave(function(v){h.slideUp()
}));for(var x in b.src){var z=b.tpls[x]||b.tpl;a("<div />").attr("name",x).append(a(z.replace(/%val/g,x).replace(/%label/g,b.src[x])).attr({unselectable:"on"})).appendTo(h).hover(function(){a(this).addClass("hover")},function(){a(this).removeClass("hover")}).click(function(B){B.stopPropagation();B.preventDefault();var w=a(this).attr("name");q.val(w);b.select(w);h.slideUp()})}var o=u.outerWidth();if(h.width()<o){h.width(o)}var A=h.height();if(b.maxHeight>0&&A>b.maxHeight){h.height(b.maxHeight)}q.val(g.val())
}return this};a.fn.elSelect.defaults={name:"el-select","class":"el-select",listClass:"list",labelTpl:null,tpl:"<%val>%label</%val>",tpls:{},value:null,src:{},select:function(b){window.console&&window.console.log&&window.console.log("selected: "+b)},maxHeight:410}})(jQuery);(function(a){elRTE=function(o,j){if(!o||!o.nodeName){return alert('elRTE: argument "target" is not DOM Element')}var c=this,f;this.version="1.3";this.build="2011-06-23";this.options=a.extend(true,{},this.options,j);this.browser=a.browser;
this.target=a(o);this.lang=(""+this.options.lang);this._i18n=new eli18n({textdomain:"rte",messages:{rte:this.i18Messages[this.lang]||{}}});this.rtl=!!(/^(ar|fa|he)$/.test(this.lang)&&this.i18Messages[this.lang]);if(this.rtl){this.options.cssClass+=" el-rte-rtl"}this.toolbar=a('<div class="toolbar"/>');this.iframe=document.createElement("iframe");this.iframe.setAttribute("frameborder",0);this.workzone=a('<div class="workzone"/>').append(this.iframe).append(this.source);this.statusbar=a('<div class="statusbar"/>');
this.tabsbar=a('<div class="tabsbar"/>');this.editor=a('<div class="'+this.options.cssClass+'" />').append(this.toolbar).append(this.workzone).append(this.statusbar).append(this.tabsbar);this.doc=null;this.$doc=null;this.window=null;this.utils=new this.utils(this);this.dom=new this.dom(this);this.filter=new this.filter(this);this.updateHeight=function(){c.workzone.add(c.iframe).add(c.source).height(c.workzone.height())};this.resizable=function(q){var p=this;if(this.options.resizable&&a.fn.resizable){if(q){this.editor.resizable({handles:"se",alsoResize:this.workzone,minWidth:300,minHeight:200}).bind("resize",p.updateHeight)
}else{this.editor.resizable("destroy").unbind("resize",p.updateHeight)}}};this.editor.insertAfter(o);var h="";if(o.nodeName=="TEXTAREA"){this.source=this.target;this.source.insertAfter(this.iframe).hide();h=this.target.val()}else{this.source=a("<textarea />").insertAfter(this.iframe).hide();h=this.target.hide().html()}this.source.attr("name",this.target.attr("name")||this.target.attr("id"));h=a.trim(h);if(!h){h=" "}if(this.options.allowSource){this.tabsbar.append('<div class="tab editor rounded-bottom-7 active">'+c.i18n("Editor")+'</div><div class="tab source rounded-bottom-7">'+c.i18n("Source")+'</div><div class="clearfix" style="clear:both"/>').children(".tab").click(function(p){if(!a(this).hasClass("active")){c.tabsbar.children(".tab").toggleClass("active");
c.workzone.children().toggle();if(a(this).hasClass("editor")){c.updateEditor();c.window.focus();c.ui.update(true)}else{c.updateSource();c.source.focus();if(a.browser.msie){}else{c.source[0].setSelectionRange(0,0)}c.ui.disable();c.statusbar.empty()}}})}this.window=this.iframe.contentWindow;this.doc=this.iframe.contentWindow.document;this.$doc=a(this.doc);f='<html xmlns="http://www.w3.org/1999/xhtml"><head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />';a.each(c.options.cssfiles,function(){f+='<link rel="stylesheet" type="text/css" href="'+this+'" />'
});this.doc.open();var g=this.filter.wysiwyg(h),b=this.rtl?' class="el-rte-rtl"':"";this.doc.write(c.options.doctype+f+"</head><body"+b+">"+(g)+"</body></html>");this.doc.close();if(a.browser.msie){this.doc.body.contentEditable=true}else{try{this.doc.designMode="on"}catch(k){}this.doc.execCommand("styleWithCSS",false,this.options.styleWithCSS)}if(this.options.height>0){this.workzone.height(this.options.height)}if(this.options.width>0){this.editor.width(this.options.width)}this.updateHeight();this.resizable(true);
this.window.focus();this.history=new this.history(this);this.selection=new this.selection(this);this.ui=new this.ui(this);this.target.parents("form").bind("submit.elfinder",function(p){c.source.parents("form").find('[name="el-select"]').remove();c.beforeSave()});this.source.bind("keydown",function(t){if(t.keyCode==9){t.preventDefault();if(a.browser.msie){var p=document.selection.createRange();p.text="\t"+p.text;this.focus()}else{var q=this.value.substr(0,this.selectionStart),u=this.value.substr(this.selectionEnd);
this.value=q+"\t"+u;this.setSelectionRange(q.length+1,q.length+1)}}});a(this.doc.body).bind("dragend",function(p){setTimeout(function(){try{c.window.focus();var r=c.selection.getBookmark();c.selection.moveToBookmark(r);c.ui.update()}catch(q){}},200)});this.typing=false;this.lastKey=null;this.$doc.bind("mouseup",function(){c.typing=false;c.lastKey=null;c.ui.update()}).bind("keyup",function(p){if((p.keyCode>=8&&p.keyCode<=13)||(p.keyCode>=32&&p.keyCode<=40)||p.keyCode==46||(p.keyCode>=96&&p.keyCode<=111)){c.ui.update()
}}).bind("keydown",function(p){if((p.metaKey||p.ctrlKey)&&p.keyCode==65){c.ui.update()}else{if(p.keyCode==13){var q=c.selection.getNode();if(c.dom.selfOrParent(q,/^PRE$/)){c.selection.insertNode(c.doc.createTextNode("\r\n"));return false}else{if(a.browser.safari&&p.shiftKey){c.selection.insertNode(c.doc.createElement("br"));return false}}}}if((p.keyCode>=48&&p.keyCode<=57)||p.keyCode==61||p.keyCode==109||(p.keyCode>=65&&p.keyCode<=90)||p.keyCode==188||p.keyCode==190||p.keyCode==191||(p.keyCode>=219&&p.keyCode<=222)){if(!c.typing){c.history.add(true)
}c.typing=true;c.lastKey=null}else{if(p.keyCode==8||p.keyCode==46||p.keyCode==32||p.keyCode==13){if(p.keyCode!=c.lastKey){c.history.add(true)}c.lastKey=p.keyCode;c.typing=false}}if(p.keyCode==32&&a.browser.opera){c.selection.insertNode(c.doc.createTextNode(" "));return false}}).bind("paste",function(q){if(!c.options.allowPaste){q.stopPropagation();q.preventDefault()}else{var t=a(c.dom.create("div"))[0],p=c.doc.createTextNode("_");c.history.add(true);c.typing=true;c.lastKey=null;t.appendChild(p);c.selection.deleteContents().insertNode(t);
c.selection.select(p);setTimeout(function(){if(t.parentNode){a(t).html(c.filter.proccess("paste",a(t).html()));p=t.lastChild;c.dom.unwrap(t);if(p){c.selection.select(p);c.selection.collapse(false)}}else{t.parentNode&&t.parentNode.removeChild(t);c.val(c.filter.proccess("paste",c.filter.wysiwyg2wysiwyg(a(c.doc.body).html())));c.selection.select(c.doc.body.firstChild);c.selection.collapse(true)}a(c.doc.body).mouseup()},15)}});if(a.browser.msie){this.$doc.bind("keyup",function(p){if(p.keyCode==86&&(p.metaKey||p.ctrlKey)){c.history.add(true);
c.typing=true;c.lastKey=null;c.selection.saveIERange();c.val(c.filter.proccess("paste",c.filter.wysiwyg2wysiwyg(a(c.doc.body).html())));c.selection.restoreIERange();a(c.doc.body).mouseup();this.ui.update()}})}if(a.browser.safari){this.$doc.bind("click",function(p){a(c.doc.body).find(".elrte-webkit-hl").removeClass("elrte-webkit-hl");if(p.target.nodeName=="IMG"){a(p.target).addClass("elrte-webkit-hl")}}).bind("keyup",function(p){a(c.doc.body).find(".elrte-webkit-hl").removeClass("elrte-webkit-hl")
})}this.window.focus();this.destroy=function(){this.updateSource();this.target.is("textarea")?this.target.val(a.trim(this.source.val())):this.target.html(a.trim(this.source.val()));this.editor.remove();this.target.show().parents("form").unbind("submit.elfinder")}};elRTE.prototype.i18n=function(b){return this._i18n.translate(b)};elRTE.prototype.open=function(){this.editor.show()};elRTE.prototype.close=function(){this.editor.hide()};elRTE.prototype.updateEditor=function(){this.val(this.source.val())
};elRTE.prototype.updateSource=function(){this.source.val(this.filter.source(a(this.doc.body).html()))};elRTE.prototype.val=function(b){if(typeof(b)=="string"){b=""+b;if(this.source.is(":visible")){this.source.val(this.filter.source2source(b))}else{if(a.browser.msie){this.doc.body.innerHTML="<br />"+this.filter.wysiwyg(b);this.doc.body.removeChild(this.doc.body.firstChild)}else{this.doc.body.innerHTML=this.filter.wysiwyg(b)}}}else{if(this.source.is(":visible")){return this.filter.source2source(this.source.val()).trim()
}else{return $.trim(this.filter.source(a(this.doc.body).html()))}}};elRTE.prototype.beforeSave=function(){this.source.val(a.trim(this.val())||"")};elRTE.prototype.save=function(){this.beforeSave();this.editor.parents("form").submit()};elRTE.prototype.log=function(b){if(window.console&&window.console.log){window.console.log(b)}};elRTE.prototype.i18Messages={};a.fn.elrte=function(g,b){var f=typeof(g)=="string"?g:"",c;this.each(function(){if(!this.elrte){this.elrte=new elRTE(this,typeof(g)=="object"?g:{})
}switch(f){case"open":case"show":this.elrte.open();break;case"close":case"hide":this.elrte.close();break;case"updateSource":this.elrte.updateSource();break;case"destroy":this.elrte.destroy()}});if(f=="val"){if(!this.length){return""}else{if(this.length==1){return b||b===''?this[0].elrte.val(b):this[0].elrte.val()}else{c={};this.each(function(){c[this.elrte.source.attr("name")]=this.elrte.val()});return c}}}return this}})(jQuery);(function(a){elRTE.prototype.dom=function(c){this.rte=c;var b=this;this.regExp={textNodes:/^(A|ABBR|ACRONYM|ADDRESS|B|BDO|BIG|BLOCKQUOTE|CAPTION|CENTER|CITE|CODE|DD|DEL|DFN|DIV|DT|EM|FIELDSET|FONT|H[1-6]|I|INS|KBD|LABEL|LEGEND|LI|MARQUEE|NOBR|NOEMBED|P|PRE|Q|SAMP|SMALL|SPAN|STRIKE|STRONG|SUB|SUP|TD|TH|TT|VAR)$/,textContainsNodes:/^(A|ABBR|ACRONYM|ADDRESS|B|BDO|BIG|BLOCKQUOTE|CAPTION|CENTER|CITE|CODE|DD|DEL|DFN|DIV|DL|DT|EM|FIELDSET|FONT|H[1-6]|I|INS|KBD|LABEL|LEGEND|LI|MARQUEE|NOBR|NOEMBED|OL|P|PRE|Q|SAMP|SMALL|SPAN|STRIKE|STRONG|SUB|SUP|TABLE|THEAD|TBODY|TFOOT|TD|TH|TR|TT|UL|VAR)$/,block:/^(APPLET|BLOCKQUOTE|BR|CAPTION|CENTER|COL|COLGROUP|DD|DIV|DL|DT|H[1-6]|EMBED|FIELDSET|LI|MARQUEE|NOBR|OBJECT|OL|P|PRE|TABLE|THEAD|TBODY|TFOOT|TD|TH|TR|UL)$/,selectionBlock:/^(APPLET|BLOCKQUOTE|BR|CAPTION|CENTER|COL|COLGROUP|DD|DIV|DL|DT|H[1-6]|EMBED|FIELDSET|LI|MARQUEE|NOBR|OBJECT|OL|P|PRE|TD|TH|TR|UL)$/,header:/^H[1-6]$/,formElement:/^(FORM|INPUT|HIDDEN|TEXTAREA|SELECT|BUTTON)$/};
this.root=function(){return this.rte.body};this.create=function(f){return this.rte.doc.createElement(f)};this.createBookmark=function(){var f=this.rte.doc.createElement("span");f.id="elrte-bm-"+Math.random().toString().substr(2);a(f).addClass("elrtebm elrte-protected");return f};this.indexOf=function(g){var f=0;g=a(g);while((g=g.prev())&&g.length){f++}return f};this.attr=function(h,f){var g="";if(h.nodeType==1){g=a(h).attr(f);if(g&&f!="src"&&f!="href"&&f!="title"&&f!="alt"){g=g.toString().toLowerCase()
}}return g||""};this.findCommonAncestor=function(j,h){if(!j||!h){return this.rte.log("dom.findCommonAncestor invalid arguments")}if(j==h){return j}else{if(j.nodeName=="BODY"||h.nodeName=="BODY"){return this.rte.doc.body}}var o=a(j).parents(),k=a(h).parents(),f=k.length-1,p=k[f];for(var g=o.length-1;g>=0;g--,f--){if(o[g]==k[f]){p=o[g]}else{break}}return p};this.isEmpty=function(f){if(f.nodeType==1){return this.regExp.textNodes.test(f.nodeName)?a.trim(a(f).text()).length==0:false}else{if(f.nodeType==3){return/^(TABLE|THEAD|TFOOT|TBODY|TR|UL|OL|DL)$/.test(f.parentNode.nodeName)||f.nodeValue==""||(a.trim(f.nodeValue).length==0&&!(f.nextSibling&&f.previousSibling&&f.nextSibling.nodeType==1&&f.previousSibling.nodeType==1&&!this.regExp.block.test(f.nextSibling.nodeName)&&!this.regExp.block.test(f.previousSibling.nodeName)))
}}return true};this.next=function(f){while(f.nextSibling&&(f=f.nextSibling)){if(f.nodeType==1||(f.nodeType==3&&!this.isEmpty(f))){return f}}return null};this.prev=function(f){while(f.previousSibling&&(f=f.previousSibling)){if(f.nodeType==1||(f.nodeType==3&&!this.isEmpty(f))){return f}}return null};this.isPrev=function(g,f){while((g=this.prev(g))){if(g==f){return true}}return false};this.nextAll=function(g){var f=[];while((g=this.next(g))){f.push(g)}return f};this.prevAll=function(g){var f=[];while((g=this.prev(g))){f.push(g)
}return f};this.toLineEnd=function(g){var f=[];while((g=this.next(g))&&g.nodeName!="BR"&&g.nodeName!="HR"&&this.isInline(g)){f.push(g)}return f};this.toLineStart=function(g){var f=[];while((g=this.prev(g))&&g.nodeName!="BR"&&g.nodeName!="HR"&&this.isInline(g)){f.unshift(g)}return f};this.isFirstNotEmpty=function(f){while((f=this.prev(f))){if(f.nodeType==1||(f.nodeType==3&&a.trim(f.nodeValue)!="")){return false}}return true};this.isLastNotEmpty=function(f){while((f=this.next(f))){if(!this.isEmpty(f)){return false
}}return true};this.isOnlyNotEmpty=function(f){return this.isFirstNotEmpty(f)&&this.isLastNotEmpty(f)};this.findLastNotEmpty=function(f){this.rte.log("findLastNotEmpty Who is here 0_o");if(f.nodeType==1&&(l=f.lastChild)){if(!this.isEmpty(l)){return l}while(l.previousSibling&&(l=l.previousSibling)){if(!this.isEmpty(l)){return l}}}return false};this.isInline=function(j){if(j.nodeType==3){return true}else{if(j.nodeType==1){j=a(j);var h=j.css("display");var g=j.css("float");return h=="inline"||h=="inline-block"||g=="left"||g=="right"
}}return true};this.is=function(h,g){if(h&&h.nodeName){if(typeof(g)=="string"){g=this.regExp[g]||/.?/}if(g instanceof RegExp&&h.nodeName){return g.test(h.nodeName)}else{if(typeof(g)=="function"){return g(h)}}}return false};this.filter=function(j,h){var f=[],g;if(!j.push){return this.is(j,h)?j:null}for(g=0;g<j.length;g++){if(this.is(j[g],h)){f.push(j[g])}}return f};this.parents=function(h,g){var f=[];while(h&&(h=h.parentNode)&&h.nodeName!="BODY"&&h.nodeName!="HTML"){if(this.is(h,g)){f.push(h)}}return f
};this.parent=function(h,g){return this.parents(h,g)[0]||null};this.selfOrParent=function(h,g,f){return this.is(h,g)?h:this.parent(h,f||g)};this.selfOrParentLink=function(f){f=this.selfOrParent(f,/^A$/);return f&&f.href?f:null};this.selfOrParentAnchor=function(f){f=this.selfOrParent(f,/^A$/);return f&&!f.href&&f.name?f:null};this.childLinks=function(g){var f=[];a("a[href]",g).each(function(){f.push(this)});return f};this.selectionHas=function(h){var j=this.rte.selection.cloneContents(),g;if(j&&j.childNodes&&j.childNodes.length){for(g=0;
g<j.childNodes.length;g++){if(typeof(h)=="function"){if(h(j.childNodes[g])){return true}}else{if(j instanceof RegExp){if(h.test(j.childNodes[g].nodeName)){return true}}}}}return false};this.wrap=function(g,f){g=a.isArray(g)?g:[g];f=f.nodeName?f:this.create(f);if(g[0]&&g[0].nodeType&&g[0].parentNode){f=g[0].parentNode.insertBefore(f,g[0]);a(g).each(function(){if(this!=f){f.appendChild(this)}})}return f};this.unwrap=function(f){if(f&&f.parentNode){while(f.firstChild){f.parentNode.insertBefore(f.firstChild,f)
}f.parentNode.removeChild(f)}};this.wrapContents=function(h,f){f=f.nodeName?f:this.create(f);for(var g=0;g<h.childNodes.length;g++){f.appendChild(h.childNodes[g])}h.appendChild(f);return f};this.cleanNode=function(f){if(f.nodeType!=1){return}if(/^(P|LI)$/.test(f.nodeName)&&(l=this.findLastNotEmpty(f))&&l.nodeName=="BR"){a(l).remove()}$n=a(f);$n.children().each(function(){this.cleanNode(this)});if(f.nodeName!="BODY"&&!/^(TABLE|TR|TD)$/.test(f)&&this.isEmpty(f)){return $n.remove()}if($n.attr("style")===""){$n.removeAttr("style")
}if(this.rte.browser.safari&&$n.hasClass("Apple-span")){$n.removeClass("Apple-span")}if(f.nodeName=="SPAN"&&!$n.attr("style")&&!$n.attr("class")&&!$n.attr("id")){$n.replaceWith($n.html())}};this.cleanChildNodes=function(g){var f=this.cleanNode;a(g).children().each(function(){f(this)})};this.tableMatrix=function(j){var h=[];if(j&&j.nodeName=="TABLE"){var g=0;function f(o){for(var k=0;k<=g;k++){if(!h[o][k]){return k}}}a(j).find("tr").each(function(k){if(!a.isArray(h[k])){h[k]=[]}a(this).children("td,th").each(function(){var p=parseInt(a(this).attr("colspan")||1);
var t=parseInt(a(this).attr("rowspan")||1);var r=f(k);for(var v=0;v<t;v++){for(var o=0;o<p;o++){var q=k+v;if(!a.isArray(h[q])){h[q]=[]}var u=o==0&&v==0?this:(v==0?o:"-");h[q][r+o]=u}}g=Math.max(g,h[k].length)})})}return h};this.indexesOfCell=function(j,h){for(var f=0;f<h.length;f++){for(var g=0;g<h[f].length;g++){if(h[f][g]==j){return[f,g]}}}};this.fixTable=function(q){if(q&&q.nodeName=="TABLE"){var h=a(q);var p=this.tableMatrix(q);var f=0;a.each(p,function(){f=Math.max(f,this.length)});if(f==0){return h.remove()
}for(var k=0;k<p.length;k++){var g=p[k].length;if(g==0){h.find("tr").eq(k).remove()}else{if(g<f){var j=f-g;var o=h.find("tr").eq(k);for(i=0;i<j;i++){o.append("<td>&nbsp;</td>")}}}}}};this.tableColumn=function(h,g,o){h=this.selfOrParent(h,/^TD|TH$/);var j=this.selfOrParent(h,/^TABLE$/);ret=[];info={offset:[],delta:[]};if(h&&j){o&&this.fixTable(j);var u=this.tableMatrix(j);var v=false;var t;for(var f=0;f<u.length;f++){for(var q=0;q<u[f].length;q++){if(u[f][q]==h){t=q;v=true;break}}if(v){break}}if(t>=0){for(var f=0;
f<u.length;f++){var k=u[f][t]||null;if(k){if(k.nodeName){ret.push(k);if(g){info.delta.push(0);info.offset.push(t)}}else{var p=parseInt(k);if(!isNaN(p)&&u[f][t-p]&&u[f][t-p].nodeName){ret.push(u[f][t-p]);if(g){info.delta.push(p);info.offset.push(t)}}}}}}}return !g?ret:{column:ret,info:info}}}})(jQuery);(function(a){elRTE.prototype.filter=function(c){var b=this,f=a("<span/>").addClass("elrtetesturl").appendTo(document.body)[0];this.url=(typeof(f.currentStyle)!="undefined"?f.currentStyle.backgroundImage:document.defaultView.getComputedStyle(f,null)["backgroundImage"]).replace(/^url\((['"]?)([\s\S]+\/)[\s\S]+\1\)$/i,"$2");
a(f).remove();this.rte=c;this.xhtml=/xhtml/i.test(c.options.doctype);this.boolAttrs=c.utils.makeObject("checked,compact,declare,defer,disabled,ismap,multiple,nohref,noresize,noshade,nowrap,readonly,selected".split(","));this.tagRegExp=/<(\/?)([\w:]+)((?:\s+[a-z\-]+(?:\s*=\s*(?:(?:"[^"]*")|(?:'[^']*')|[^>\s]+))?)*)\s*\/?>/g;this.openTagRegExp=/<([\w:]+)((?:\s+\w+(?:\s*=\s*(?:(?:"[^"]*")|(?:'[^']*')|[^>\s]+))?)*)\s*\/?>/g;this.attrRegExp=/(\w+)(?:\s*=\s*(?:(?:"[^"]*")|(?:'[^']*')|[^\s]+))?/g;this.scriptRegExp=/<script([^>]*)>([\s\S]*?)<\/script>/gi;
this.styleRegExp=/(<style([^>]*)>[\s\S]*?<\/style>)/gi;this.linkRegExp=/(<link([^>]+)>)/gi;this.cdataRegExp=/<!\[CDATA\[([\s\S]+)\]\]>/g;this.objRegExp=/<object([^>]*)>([\s\S]*?)<\/object>/gi;this.embRegExp=/<(embed)((?:\s+\w+(?:\s*=\s*(?:(?:"[^"]*")|(?:'[^']*')|[^>\s]+))?)*)\s*>/gi;this.paramRegExp=/<(param)((?:\s+\w+(?:\s*=\s*(?:(?:"[^"]*")|(?:'[^']*')|[^>\s]+))?)*)\s*>/gi;this.iframeRegExp=/<iframe([^>]*)>([\s\S]*?)<\/iframe>/gi;this.yMapsRegExp=/<div\s+([^>]*id\s*=\s*('|")?YMapsID[^>]*)>/gi;this.gMapsRegExp=/<iframe\s+([^>]*src\s*=\s*"http:\/\/maps\.google\.\w+[^>]*)>([\s\S]*?)<\/iframe>/gi;
this.videoHostRegExp=/^(http:\/\/[\w\.]*)?(youtube|vimeo|rutube).*/i;this.serviceClassRegExp=/<(\w+)([^>]*class\s*=\s*"[^>]*elrte-[^>]*)>\s*(<\/\1>)?/gi;this.pagebreakRegExp=/<(\w+)([^>]*style\s*=\s*"[^>]*page-break[^>]*)>\s*(<\/\1>)?/gi;this.pbRegExp=new RegExp("<!-- pagebreak -->","gi");this.allowTags=c.options.allowTags.length?c.utils.makeObject(c.options.allowTags):null;this.denyTags=c.options.denyTags.length?c.utils.makeObject(c.options.denyTags):null;this.denyAttr=c.options.denyAttr?c.utils.makeObject(c.options.denyAttr):null;
this.pasteDenyAttr=c.options.pasteDenyAttr?c.utils.makeObject(c.options.pasteDenyAttr):null;this.fontSize=["medium","xx-small","small","medium","large","x-large","xx-large"];this.fontFamily={"sans-serif":/^(arial|tahoma|verdana)$/i,serif:/^(times|times new roman)$/i,monospace:/^courier$/i};this.scripts={};this._chains={};a.each(this.chains,function(g){b._chains[g]=[];a.each(this,function(h,j){typeof(b.rules[j])=="function"&&b._chains[g].push(b.rules[j])})});this.proccess=function(h,g){g=a.trim(g).replace(/^\s*(&nbsp;)+/gi,"").replace(/(&nbsp;|<br[^>]*>)+\s*$/gi,"");
a.each(this._chains[h]||[],function(){g=this.call(b,g)});g=g.replace(/\t/g,"  ").replace(/\r/g,"").replace(/\s*\n\s*\n+/g,"\n")+"  ";return a.trim(g)?g:" "};this.wysiwyg=function(g){return this.proccess("wysiwyg",g)};this.source=function(g){return this.proccess("source",g)};this.source2source=function(g){return this.proccess("source2source",g)};this.wysiwyg2wysiwyg=function(g){return this.proccess("wysiwyg2wysiwyg",g)};this.parseAttrs=function(p){var j={},h=this.boolAttrs,g=p.match(this.attrRegExp),o,q,k;
g&&a.each(g,function(r,t){o=t.split("=");q=a.trim(o[0]).toLowerCase();if(o.length>2){o.shift();k=o.join("=")}else{k=h[q]||o[1]||""}j[q]=a.trim(k).replace(/^('|")(.*)(\1)$/,"$2")});j.style=this.rte.utils.parseStyle(j.style);j["class"]=this.rte.utils.parseClass(j["class"]||"");return j};this.serializeAttrs=function(g,k){var j=[],h=this;a.each(g,function(p,o){if(p=="style"){o=h.rte.utils.serializeStyle(o,k)}else{if(p=="class"){o=h.rte.utils.serializeClass(o)}}o&&j.push(p+'="'+o+'"')});return j.join(" ")
};this.cleanAttrs=function(g,j){var h=this,o=this.replaceAttrs;a.each(g["class"],function(p){/^(Apple-style-span|mso\w+)$/i.test(p)&&delete g["class"][p]});function k(p){return p+(/\d$/.test(p)?"px":"")}a.each(g,function(q,p){o[q]&&o[q].call(h,g,j);if(q=="style"){a.each(p,function(t,r){switch(t){case"mso-padding-alt":case"mso-padding-top-alt":case"mso-padding-right-alt":case"mso-padding-bottom-alt":case"mso-padding-left-alt":case"mso-margin-alt":case"mso-margin-top-alt":case"mso-margin-right-alt":case"mso-margin-bottom-alt":case"mso-margin-left-alt":case"mso-table-layout-alt":case"mso-height":case"mso-width":case"mso-vertical-align-alt":g.style[t.replace(/^mso-|-alt$/g,"")]=k(r);
delete g.style[t];break;case"horiz-align":g.style["text-align"]=r;delete g.style[t];break;case"vert-align":g.style["vertical-align"]=r;delete g.style[t];break;case"font-color":case"mso-foreground":g.style.color=r;delete g.style[t];break;case"mso-background":case"mso-highlight":g.style.background=r;delete g.style[t];break;case"mso-default-height":g.style["min-height"]=k(r);delete g.style[t];break;case"mso-default-width":g.style["min-width"]=k(r);delete g.style[t];break;case"mso-padding-between-alt":g.style["border-collapse"]="separate";
g.style["border-spacing"]=k(r);delete g.style[t];break;case"text-line-through":if(r.match(/(single|double)/i)){g.style["text-decoration"]="line-through"}delete g.style[t];break;case"mso-zero-height":if(r=="yes"){g.style.display="none"}delete g.style[t];break;case"font-weight":if(r==700){g.style["font-weight"]="bold"}break;default:if(t.match(/^(mso|column|font-emph|lang|layout|line-break|list-image|nav|panose|punct|row|ruby|sep|size|src|tab-|table-border|text-(?!align|decor|indent|trans)|top-bar|version|vnd|word-break)/)){delete g.style[t]
}}})}});return g}};elRTE.prototype.filter.prototype.replaceTags={b:{tag:"strong"},big:{tag:"span",style:{"font-size":"large"}},center:{tag:"div",style:{"text-align":"center"}},i:{tag:"em"},font:{tag:"span"},nobr:{tag:"span",style:{"white-space":"nowrap"}},menu:{tag:"ul"},plaintext:{tag:"pre"},s:{tag:"strike"},small:{tag:"span",style:{"font-size":"small"}},u:{tag:"span",style:{"text-decoration":"underline"}},xmp:{tag:"pre"}};elRTE.prototype.filter.prototype.replaceAttrs={align:function(b,c){switch(c){case"img":b.style[b.align.match(/(left|right)/)?"float":"vertical-align"]=b.align;
break;case"table":if(b.align=="center"){b.style["margin-left"]=b.style["margin-right"]="auto"}else{b.style["float"]=b.align}break;default:b.style["text-align"]=b.align}delete b.align},border:function(b){!b.style["border-width"]&&(b.style["border-width"]=(parseInt(b.border)||1)+"px");!b.style["border-style"]&&(b.style["border-style"]="solid");delete b.border},bordercolor:function(b){!b.style["border-color"]&&(b.style["border-color"]=b.bordercolor);delete b.bordercolor},background:function(b){!b.style["background-image"]&&(b.style["background-image"]="url("+b.background+")");
delete b.background},bgcolor:function(b){!b.style["background-color"]&&(b.style["background-color"]=b.bgcolor);delete b.bgcolor},clear:function(b){b.style.clear=b.clear=="all"?"both":b.clear;delete b.clear},color:function(b){!b.style.color&&(b.style.color=b.color);delete b.color},face:function(b){var c=b.face.toLowerCase();a.each(this.fontFamily,function(g,f){if(c.match(f)){b.style["font-family"]=c+","+g}});delete b.face},hspace:function(b,f){if(f=="img"){var c=parseInt(b.hspace)||0;!b.style["margin-left"]&&(b.style["margin-left"]=c+"px");
!b.style["margin-right"]&&(b.style["margin-right"]=c+"px");delete b.hspace}},size:function(b,c){if(c!="input"){b.style["font-size"]=this.fontSize[parseInt(b.size)||0]||"medium";delete b.size}},valign:function(b){if(!b.style["vertical-align"]){b.style["vertical-align"]=b.valign}delete b.valign},vspace:function(b,f){if(f=="img"){var c=parseInt(b.vspace)||0;!b.style["margin-top"]&&(b.style["margin-top"]=c+"px");!b.style["margin-bottom"]&&(b.style["margin-bottom"]=c+"px");delete b.hspace}}};elRTE.prototype.filter.prototype.rules={allowedTags:function(c){var b=this.allowTags;
return b?c.replace(this.tagRegExp,function(f,h,g){return b[g.toLowerCase()]?f:""}):c},deniedTags:function(b){var c=this.denyTags;return c?b.replace(this.tagRegExp,function(f,h,g){return c[g.toLowerCase()]?"":f}):b},clean:function(g){var c=this,b=this.replaceTags,h=this.replaceAttrs,f=this.denyAttr,j;g=g.replace(/<!DOCTYPE([\s\S]*)>/gi,"").replace(/<p [^>]*class="?MsoHeading"?[^>]*>(.*?)<\/p>/gi,"<p><strong>$1</strong></p>").replace(/<span\s+style\s*=\s*"\s*mso-spacerun\s*:\s*yes\s*;?\s*"\s*>([\s&nbsp;]*)<\/span>/gi,"$1").replace(/(<p[^>]*>\s*<\/p>|<p[^>]*\/>)/gi,"<br>").replace(/(<\/p>)(?:\s*<br\s*\/?>\s*|\s*&nbsp;\s*)+\s*(<p[^>]*>)/gi,function(o,k,p){return k+"\n"+p
}).replace(this.tagRegExp,function(o,q,p,k){p=p.toLowerCase();if(q){return"</"+(b[p]?b[p].tag:p)+">"}k=c.cleanAttrs(c.parseAttrs(k||""),p);if(b[p]){b[p].style&&a.extend(k.style,b[p].style);p=b[p].tag}f&&a.each(k,function(r){if(f[r]){delete k[r]}});k=c.serializeAttrs(k);return"<"+p+(k?" ":"")+k+">"});j=a("<div>"+g+"</div>");j.find("span:not([id]):not([class])").each(function(){var k=a(this);if(!k.attr("style")){a.trim(k.html()).length?c.rte.dom.unwrap(this):k.remove()}}).end().find("span span:only-child").each(function(){var o=a(this),u=o.parent().eq(0),r=o.attr("id"),k=u.attr("id"),w,q,v;
if(c.rte.dom.isOnlyNotEmpty(this)&&(!r||!k)){v=a.trim(u.attr("class")+" "+o.attr("class"));v&&u.attr("class",v);q=c.rte.utils.serializeStyle(a.extend(c.rte.utils.parseStyle(a(this).attr("style")||""),c.rte.utils.parseStyle(a(u).attr("style")||"")));q&&u.attr("style",q);w=r||k;w&&u.attr("id",w);this.firstChild?a(this.firstChild).unwrap():o.remove()}}).end().find("a[name]").each(function(){a(this).addClass("elrte-protected elrte-anchor")});return j.html()},cleanPaste:function(c){var b=this,f=this.pasteDenyAttr;
c=c.replace(this.scriptRegExp,"").replace(this.styleRegExp,"").replace(this.linkRegExp,"").replace(this.cdataRegExp,"").replace(/\<\!--[\s\S]*?--\>/g,"");if(this.rte.options.pasteOnlyText){c=c.replace(this.tagRegExp,function(g,j,h){return/br/i.test(h)||(j&&/h[1-6]|p|ol|ul|li|div|blockquote|tr/i)?"<br>":""}).replace(/(&nbsp;|<br[^>]*>)+\s*$/gi,"")}else{if(f){c=c.replace(this.openTagRegExp,function(h,j,g){g=b.parseAttrs(g);a.each(g,function(k){if(f[k]){delete g[k]}});g=b.serializeAttrs(g,true);return"<"+j+(g?" ":"")+g+">"
})}}return c},replace:function(o){var q=this,b=this.rte.options.replace||[],g;if(b.length){a.each(b,function(r,t){if(typeof(t)=="function"){o=t.call(q,o)}})}function k(x,D){var E=r(),B=E&&q.videoHostRegExp.test(E)?E.replace(q.videoHostRegExp,"$2"):D.replace(/^\w+\/(.+)/,"$1"),C=parseInt((x.obj?x.obj.width||x.obj.style.width:0)||(x.embed?x.embed.width||x.embed.style.width:0))||150,A=parseInt((x.obj?x.obj.height||x.obj.style.height:0)||(x.embed?x.embed.height||x.embed.style.height:0))||100,v="media"+Math.random().toString().substring(2),u="",z;
function r(){if(x.embed&&x.embed.src){return x.embed.src}if(x.params&&x.params.length){z=x.params.length;while(z--){if(x.params[z].name=="src"||x.params[z].name=="movie"){return x.params[z].value}}}}if(x.obj&&x.obj.style&&x.obj.style["float"]){u=' style="float:'+x.obj.style["float"]+'"'}q.scripts[v]=x;return'<img src="'+q.url+'pixel.gif" class="elrte-media elrte-media-'+B+' elrte-protected" title="'+(E?q.rte.utils.encode(E):"")+'" rel="'+v+'" width="'+C+'" height="'+A+'"'+u+">"}o=o.replace(this.styleRegExp,"<!-- ELRTE_COMMENT$1 -->").replace(this.linkRegExp,"<!-- ELRTE_COMMENT$1-->").replace(this.cdataRegExp,"<!--[CDATA[$1]]-->").replace(this.scriptRegExp,function(u,r,v){var w;
if(q.denyTags.script){return""}w="script"+Math.random().toString().substring(2);r=q.parseAttrs(r);!r.type&&(r.type="text/javascript");q.scripts[w]="<script "+q.serializeAttrs(r)+">"+v+"<\/script>";return"<!-- ELRTE_SCRIPT:"+(w)+" -->"}).replace(this.yMapsRegExp,function(u,r){r=q.parseAttrs(r);r["class"]["elrte-yandex-maps"]="elrte-yandex-maps";r["class"]["elrte-protected"]="elrte-protected";return"<div "+q.serializeAttrs(r)+">"}).replace(this.gMapsRegExp,function(v,u){var z="gmaps"+Math.random().toString().substring(2),r,x;
u=q.parseAttrs(u);r=parseInt(u.width||u.style.width||100);x=parseInt(u.height||u.style.height||100);q.scripts[z]=v;return'<img src="'+q.url+'pixel.gif" class="elrte-google-maps elrte-protected" id="'+z+'" style="width:'+r+"px;height:"+x+'px">'}).replace(this.objRegExp,function(w,u,z){var r=z.match(q.embRegExp),x={obj:q.parseAttrs(u),embed:r&&r.length?q.parseAttrs(r[0].substring(7)):null,params:[]},v=q.rte.utils.mediaInfo(x.embed?x.embed.type||"":"",x.obj.classid||"");if(v){if((r=z.match(q.paramRegExp))){a.each(r,function(t,A){x.params.push(q.parseAttrs(A.substring(6)))
})}!x.obj.classid&&(x.obj.classid=v.classid[0]);!x.obj.codebase&&(x.obj.codebase=v.codebase);x.embed&&!x.embed.type&&(x.embed.type=v.type);x.obj.width=="1"&&delete x.obj.width;x.obj.height=="1"&&delete x.obj.height;if(x.embed){x.embed.width=="1"&&delete x.embed.width;x.embed.height=="1"&&delete x.embed.height}return k(x,v.type)}return w}).replace(this.embRegExp,function(v,w,r){var r=q.parseAttrs(r),u=q.rte.utils.mediaInfo(r.type||"");r.width=="1"&&delete r.width;r.height=="1"&&delete r.height;return u?k({embed:r},u.type):v
}).replace(this.iframeRegExp,function(x,u){var u=q.parseAttrs(u);var r=u.style.width||(parseInt(u.width)>1?parseInt(u.width)+"px":"100px");var z=u.style.height||(parseInt(u.height)>1?parseInt(u.height)+"px":"100px");var A="iframe"+Math.random().toString().substring(2);q.scripts[A]=x;var v='<img id="'+A+'" src="'+q.url+'pixel.gif" class="elrte-protected elrte-iframe" style="width:'+r+"; height:"+z+'">';return v}).replace(this.vimeoRegExp,function(u,v,r){r=q.parseAttrs(r);delete r.frameborder;r.width=="1"&&delete r.width;
r.height=="1"&&delete r.height;r.type="application/x-shockwave-flash";return k({embed:r},"application/x-shockwave-flash")}).replace(/<\/(embed|param)>/gi,"").replace(this.pbRegExp,function(){return'<img src="'+q.url+'pixel.gif" class="elrte-protected elrte-pagebreak">'});g=a("<div>"+o+"</div>");if(!this.rte.options.allowTextNodes){var h=this.rte.dom,c=[],p=[];if(a.browser.msie){for(var j=0;j<g[0].childNodes.length;j++){c.push(g[0].childNodes[j])}}else{c=Array.prototype.slice.call(g[0].childNodes)
}function f(){if(p.length&&h.filter(p,"notEmpty").length){h.wrap(p,document.createElement("p"))}p=[]}a.each(c,function(r,t){if(h.is(t,"block")){f()}else{if(p.length&&t.previousSibling!=p[p.length-1]){f()}p.push(t)}});f()}return g.html()},restore:function(c){var b=this,f=this.rte.options.restore||[];if(f.length){a.each(f,function(g,h){if(typeof(h)=="function"){c=h.call(b,c)}})}c=c.replace(/\<\!--\[CDATA\[([\s\S]*?)\]\]--\>/gi,"<![CDATA[$1]]>").replace(/\<\!--\s*ELRTE_SCRIPT\:\s*(script\d+)\s*--\>/gi,function(g,h){if(b.scripts[h]){g=b.scripts[h];
delete b.scripts[h]}return g||""}).replace(/\<\!-- ELRTE_COMMENT([\s\S]*?) --\>/gi,"$1").replace(this.serviceClassRegExp,function(k,r,g,p){var g=b.parseAttrs(g),h,q="";if(g["class"]["elrte-google-maps"]){var k="";if(b.scripts[g.id]){k=b.scripts[g.id];delete b.scripts[g.id]}return k}else{if(g["class"]["elrte-iframe"]){return b.scripts[g.id]||""}else{if(g["class"]["elrtebm"]){return""}else{if(g["class"]["elrte-media"]){h=b.scripts[g.rel]||{};h.params&&a.each(h.params,function(j,o){q+="<param "+b.serializeAttrs(o)+">\n"
});h.embed&&(q+="<embed "+b.serializeAttrs(h.embed)+">");h.obj&&(q="<object "+b.serializeAttrs(h.obj)+">\n"+q+"\n</object>\n");return q||k}else{if(g["class"]["elrte-pagebreak"]){return"<!-- pagebreak -->"}}}}}a.each(g["class"],function(j){if(/^elrte-\w+/i.test(j)){delete (g["class"][j])}});return"<"+r+" "+b.serializeAttrs(g)+">"+(p||"")});return c},compactStyles:function(c){var b=this;return c.replace(this.tagRegExp,function(g,j,h,f){f=!j&&f?b.serializeAttrs(b.parseAttrs(f),true):"";return"<"+j+h.toLowerCase()+(f?" ":"")+f+">"
})},xhtmlTags:function(b){return this.xhtml?b.replace(/<(img|hr|br|embed|param|link|area)([^>]*\/*)>/gi,"<$1$2 />"):b}};elRTE.prototype.filter.prototype.chains={wysiwyg:["replace","clean","allowedTags","deniedTags","compactStyles"],source:["clean","allowedTags","restore","compactStyles","xhtmlTags"],paste:["clean","allowedTags","cleanPaste","replace","deniedTags","compactStyles"],wysiwyg2wysiwyg:["clean","allowedTags","restore","replace","deniedTags","compactStyles"],source2source:["clean","allowedTags","replace","deniedTags","restore","compactStyles","xhtmlTags"]}
})(jQuery);(function(a){elRTE.prototype.history=function(b){this.rte=b;this._prev=[];this._next=[];this.add=function(){if(this.rte.options.historyLength>0&&this._prev.length>=this.rte.options.historyLength){this._prev.slice(this.rte.options.historyLength)}var c=this.rte.selection.getBookmark();this._prev.push([a(this.rte.doc.body).html(),c]);this.rte.selection.moveToBookmark(c);this._next=[]};this.back=function(){if(this._prev.length){var c=this.rte.selection.getBookmark(),f=this._prev.pop();this._next.push([a(this.rte.doc.body).html(),c]);
a(this.rte.doc.body).html(f[0]);this.rte.selection.moveToBookmark(f[1])}};this.fwd=function(){if(this._next.length){var c=this.rte.selection.getBookmark(),f=this._next.pop();this._prev.push([a(this.rte.doc.body).html(),c]);a(this.rte.doc.body).html(f[0]);this.rte.selection.moveToBookmark(f[1])}};this.canBack=function(){return this._prev.length};this.canFwd=function(){return this._next.length}}})(jQuery);(function(a){elRTE.prototype.options={doctype:'<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN">',cssClass:"el-rte",cssfiles:[],height:null,resizable:true,lang:"en",toolbar:"normal",absoluteURLs:true,allowSource:true,stripWhiteSpace:true,styleWithCSS:false,fmAllow:true,fmOpen:null,allowTags:[],denyTags:["applet","base","basefont","bgsound","blink","body","col","colgroup","isindex","frameset","html","head","meta","marquee","noframes","noembed","o:p","title","xml"],denyAttr:[],pasteDenyAttr:["id","name","class","style","language","onclick","ondblclick","onhover","onkeup","onkeydown","onkeypress"],allowTextNodes:true,allowBrowsersSpecStyles:false,allowPaste:true,pasteOnlyText:false,replace:[],restore:[],pagebreak:'<div style="page-break-after: always;"></div>',buttons:{save:"Save",copy:"Copy",cut:"Cut",css:"Css style and class",paste:"Paste",pastetext:"Paste only text",pasteformattext:"Paste formatted text",removeformat:"Clean format",undo:"Undo last action",redo:"Redo previous action",bold:"Bold",italic:"Italic",underline:"Underline",strikethrough:"Strikethrough",superscript:"Superscript",subscript:"Subscript",justifyleft:"Align left",justifyright:"Ailgn right",justifycenter:"Align center",justifyfull:"Align full",indent:"Indent",outdent:"Outdent",rtl:"Right to left",ltr:"Left to right",forecolor:"Font color",hilitecolor:"Background color",formatblock:"Format",fontsize:"Font size",fontname:"Font",insertorderedlist:"Ordered list",insertunorderedlist:"Unordered list",horizontalrule:"Horizontal rule",blockquote:"Blockquote",div:"Block element (DIV)",link:"Link",unlink:"Delete link",anchor:"Bookmark",image:"Image",pagebreak:"Page break",smiley:"Smiley",flash:"Flash",table:"Table",tablerm:"Delete table",tableprops:"Table properties",tbcellprops:"Table cell properties",tbrowbefore:"Insert row before",tbrowafter:"Insert row after",tbrowrm:"Delete row",tbcolbefore:"Insert column before",tbcolafter:"Insert column after",tbcolrm:"Delete column",tbcellsmerge:"Merge table cells",tbcellsplit:"Split table cell",docstructure:"Toggle display document structure",elfinder:"Open file manager",fullscreen:"Toggle full screen mode",nbsp:"Non breakable space",stopfloat:"Stop element floating",about:"About this software"},panels:{eol:[],save:["save"],copypaste:["copy","cut","paste","pastetext","pasteformattext","removeformat","docstructure"],undoredo:["undo","redo"],style:["bold","italic","underline","strikethrough","subscript","superscript"],colors:["forecolor","hilitecolor"],alignment:["justifyleft","justifycenter","justifyright","justifyfull"],indent:["outdent","indent"],format:["formatblock","fontsize","fontname"],lists:["insertorderedlist","insertunorderedlist"],elements:["horizontalrule","blockquote","div","stopfloat","css","nbsp","smiley","pagebreak"],direction:["ltr","rtl"],links:["link","unlink","anchor"],images:["image"],media:["image","flash"],tables:["table","tableprops","tablerm","tbrowbefore","tbrowafter","tbrowrm","tbcolbefore","tbcolafter","tbcolrm","tbcellprops","tbcellsmerge","tbcellsplit"],elfinder:["elfinder"],fullscreen:["fullscreen","about"]},toolbars:{tiny:["style"],compact:["save","undoredo","style","alignment","lists","links","fullscreen"],normal:["save","copypaste","undoredo","style","alignment","colors","indent","lists","links","elements","images","fullscreen"],complete:["save","copypaste","undoredo","style","alignment","colors","format","indent","lists","links","elements","media","fullscreen"],maxi:["save","copypaste","undoredo","elfinder","style","alignment","direction","colors","format","indent","lists","links","elements","media","tables","fullscreen"],eldorado:["save","copypaste","elfinder","undoredo","style","alignment","colors","format","indent","lists","links","elements","media","tables","fullscreen"]},panelNames:{save:"Save",copypaste:"Copy/Pase",undoredo:"Undo/Redo",style:"Text styles",colors:"Colors",alignment:"Alignment",indent:"Indent/Outdent",format:"Text format",lists:"Lists",elements:"Misc elements",direction:"Script direction",links:"Links",images:"Images",media:"Media",tables:"Tables",elfinder:"File manager (elFinder)"}}
})(jQuery);(function(a){elRTE.prototype.selection=function(g){this.rte=g;var c=this;this.w3cRange=null;var o,b,j,k;a(this.rte.doc).keyup(function(p){if(p.ctrlKey||p.metaKey||(p.keyCode>=8&&p.keyCode<=13)||(p.keyCode>=32&&p.keyCode<=40)||p.keyCode==46||(p.keyCode>=96&&p.keyCode<=111)){c.cleanCache()}}).mousedown(function(p){if(p.target.nodeName=="HTML"){o=c.rte.doc.body}else{o=p.target}b=j=null}).mouseup(function(p){if(p.target.nodeName=="HTML"){b=c.rte.doc.body}else{b=p.target}b=p.target;j=null}).click();
function h(){return c.rte.window.getSelection?c.rte.window.getSelection():c.rte.window.document.selection}function f(t,r,q){while(t.nodeName!="BODY"&&t.parentNode&&t.parentNode.nodeName!="BODY"&&(r?t!==r&&t.parentNode!=r:1)&&((q=="left"&&c.rte.dom.isFirstNotEmpty(t))||(q=="right"&&c.rte.dom.isLastNotEmpty(t))||(c.rte.dom.isFirstNotEmpty(t)&&c.rte.dom.isLastNotEmpty(t)))){t=t.parentNode}return t}this.collapsed=function(){return this.getRangeAt().isCollapsed()};this.collapse=function(p){var q=h(),t=this.getRangeAt();
t.collapse(p?true:false);if(!a.browser.msie){q.removeAllRanges();q.addRange(t)}return this};this.getRangeAt=function(t){if(this.rte.browser.msie){if(!this.w3cRange){this.w3cRange=new this.rte.w3cRange(this.rte)}t&&this.w3cRange.update();return this.w3cRange}var p=h();var q=p.rangeCount>0?p.getRangeAt(0):this.rte.doc.createRange();q.getStart=function(){return this.startContainer.nodeType==1?this.startContainer.childNodes[Math.min(this.startOffset,this.startContainer.childNodes.length-1)]:this.startContainer
};q.getEnd=function(){return this.endContainer.nodeType==1?this.endContainer.childNodes[Math.min(this.startOffset==this.endOffset?this.endOffset:this.endOffset-1,this.endContainer.childNodes.length-1)]:this.endContainer};q.isCollapsed=function(){return this.collapsed};return q};this.saveIERange=function(){if(a.browser.msie){k=this.getRangeAt().getBookmark()}};this.restoreIERange=function(){a.browser.msie&&k&&this.getRangeAt().moveToBookmark(k)};this.cloneContents=function(){var v=this.rte.dom.create("div"),q,u,p;
if(a.browser.msie){try{q=this.rte.window.document.selection.createRange()}catch(t){q=this.rte.doc.body.createTextRange()}a(v).html(q.htmlText)}else{u=this.getRangeAt().cloneContents();for(p=0;p<u.childNodes.length;p++){v.appendChild(u.childNodes[p].cloneNode(true))}}return v};this.select=function(t,w){w=w||t;if(this.rte.browser.msie){var u=this.rte.doc.body.createTextRange(),q=u.duplicate(),p=u.duplicate();q.moveToElementText(t);p.moveToElementText(w);u.setEndPoint("StartToStart",q);u.setEndPoint("EndToEnd",p);
u.select()}else{var v=h(),u=this.getRangeAt();u.setStartBefore(t);u.setEndAfter(w);v.removeAllRanges();v.addRange(u)}return this.cleanCache()};this.selectContents=function(u){var q=this.getRangeAt();if(u&&u.nodeType==1){if(this.rte.browser.msie){q.range();q.r.moveToElementText(u.parentNode);q.r.select()}else{try{q.selectNodeContents(u)}catch(t){return this.rte.log("unable select node contents "+u)}var p=h();p.removeAllRanges();p.addRange(q)}}return this};this.deleteContents=function(){if(!a.browser.msie){this.getRangeAt().deleteContents()
}return this};this.insertNode=function(v,u){if(u&&!this.collapsed()){this.collapse()}if(this.rte.browser.msie){var p=v.nodeType==3?v.nodeValue:a(this.rte.dom.create("span")).append(a(v)).html();var t=this.getRangeAt();t.insertNode(p)}else{var t=this.getRangeAt();t.insertNode(v);t.setStartAfter(v);t.setEndAfter(v);var q=h();q.removeAllRanges();q.addRange(t)}return this.cleanCache()};this.insertHtml=function(p,q){if(q&&!this.collapsed()){this.collapse()}if(this.rte.browser.msie){this.getRangeAt().range().pasteHTML(p)
}else{var n=a(this.rte.dom.create("span")).html(p||"").get(0).childNodes;while(n.length)this.insertNode(n[0])}return this.cleanCache()};this.insertText=function(q,p){var r=this.rte.doc.createTextNode(q);return this.insertHtml(r.nodeValue)};this.getBookmark=function(){this.rte.window.focus();var p,v,t,z,w,A=this.rte.dom.createBookmark(),x=this.rte.dom.createBookmark();if(a.browser.msie){try{p=this.rte.window.document.selection.createRange()}catch(x){p=this.rte.doc.body.createTextRange()}if(p.item){var u=p.item(0);
p=this.rte.doc.body.createTextRange();p.moveToElementText(u)}v=p.duplicate();t=p.duplicate();z=this.rte.dom.create("span");w=this.rte.dom.create("span");z.appendChild(A);w.appendChild(x);v.collapse(true);v.pasteHTML(z.innerHTML);t.collapse(false);t.pasteHTML(w.innerHTML)}else{var q=h();var p=q.rangeCount>0?q.getRangeAt(0):this.rte.doc.createRange();v=p.cloneRange();t=p.cloneRange();t.collapse(false);t.insertNode(x);v.collapse(true);v.insertNode(A);this.select(A,x)}return[A.id,x.id]};this.moveToBookmark=function(p){this.rte.window.focus();
if(p&&p.length==2){var q=this.rte.doc.getElementById(p[0]),v=this.rte.doc.getElementById(p[1]),u,t;if(q&&v){this.select(q,v);if(this.rte.dom.next(q)==v){this.collapse(true)}if(!a.browser.msie){u=h();t=u.rangeCount>0?u.getRangeAt(0):this.rte.doc.createRange();u.removeAllRanges();u.addRange(t)}q.parentNode.removeChild(q);v.parentNode.removeChild(v)}}return this};this.removeBookmark=function(p){this.rte.window.focus();if(p.length==2){var q=this.rte.doc.getElementById(p[0]),r=this.rte.doc.getElementById(p[1]);
if(q&&r){q.parentNode.removeChild(q);r.parentNode.removeChild(r)}}};this.cleanCache=function(){o=b=j=null;return this};this.getStart=function(){if(!o){var p=this.getRangeAt();o=p.getStart()}return o};this.getEnd=function(){if(!b){var p=this.getRangeAt();b=p.getEnd()}return b};this.getNode=function(){if(!j){j=this.rte.dom.findCommonAncestor(this.getStart(),this.getEnd())}return j};this.selected=function(r){var p={collapsed:false,blocks:false,filter:false,wrap:"text",tag:"span"};p=a.extend({},p,r);
if(p.blocks){var v=this.getNode(),u=null;if(u=this.rte.dom.selfOrParent(v,"selectionBlock")){return[u]}}var t=this.selectedRaw(p.collapsed,p.blocks);var A=[];var w=[];var B=null;function q(){function D(){for(var F=0;F<w.length;F++){if(w[F].nodeType==1&&(c.rte.dom.selfOrParent(w[F],/^P$/)||a(w[F]).find("p").length>0)){return false}}return true}if(w.length>0){var C=p.tag=="p"&&!D()?"div":p.tag;var E=c.rte.dom.wrap(w,C);A[B]=E;B=null;w=[]}}function z(E){if(E.nodeType==1){if(/^(THEAD|TFOOT|TBODY|COL|COLGROUP|TR)$/.test(E.nodeName)){a(E).find("td,th").each(function(){var F=p.tag=="p"&&a(this).find("p").length>0?"div":p.tag;
var G=c.rte.dom.wrapContents(this,F);return A.push(G)})}else{if(/^(CAPTION|TD|TH|LI|DT|DD)$/.test(E.nodeName)){var C=p.tag=="p"&&a(E).find("p").length>0?"div":p.tag;var E=c.rte.dom.wrapContents(E,C);return A.push(E)}}}var D=w.length>0?w[w.length-1]:null;if(D&&D!=c.rte.dom.prev(E)){q()}w.push(E);if(B===null){B=A.length;A.push("dummy")}}if(t.nodes.length>0){for(var x=0;x<t.nodes.length;x++){var v=t.nodes[x];if(v.nodeType==3&&(x==0||x==t.nodes.length-1)&&a.trim(v.nodeValue).length>0){if(x==0&&t.so>0){v=v.splitText(t.so)
}if(x==t.nodes.length-1&&t.eo>0){v.splitText(x==0&&t.so>0?t.eo-t.so:t.eo)}}switch(p.wrap){case"text":if((v.nodeType==1&&v.nodeName=="BR")||(v.nodeType==3&&a.trim(v.nodeValue).length>0)){z(v)}else{if(v.nodeType==1){A.push(v)}}break;case"inline":if(this.rte.dom.isInline(v)){z(v)}else{if(v.nodeType==1){A.push(v)}}break;case"all":if(v.nodeType==1||!this.rte.dom.isEmpty(v)){z(v)}break;default:if(v.nodeType==1||!this.rte.dom.isEmpty(v)){A.push(v)}}}q()}if(A.length){this.rte.window.focus();this.select(A[0],A[A.length-1])
}return p.filter?this.rte.dom.filter(A,p.filter):A};this.dump=function(p,t,w,v,q){var u=this.getRangeAt();this.rte.log("commonAncestorContainer");this.rte.log(p||u.commonAncestorContainer);this.rte.log("startContainer");this.rte.log(t||u.startContainer);this.rte.log("startOffset: "+(v>=0?v:u.startOffset));this.rte.log("endContainer");this.rte.log(w||u.endContainer);this.rte.log("endOffset: "+(q>=0?q:u.endOffset))};this.selectedRaw=function(z,p){var F={so:null,eo:null,nodes:[]};var q=this.getRangeAt(true);
var w=q.commonAncestorContainer;var H,E;var D=false;var B=false;function C(J,r,I){if(J.nodeType==3){I=I>=0?I:J.nodeValue.length;return(r==0&&I==J.nodeValue.length)||a.trim(J.nodeValue).length==a.trim(J.nodeValue.substring(r,I)).length}return true}function x(J,r,I){if(J.nodeType==1){return c.rte.dom.isEmpty(J)}else{if(J.nodeType==3){return a.trim(J.nodeValue.substring(r||0,I>=0?I:J.nodeValue.length)).length==0}}return true}if(q.startContainer.nodeType==1){if(q.startOffset<q.startContainer.childNodes.length){H=q.startContainer.childNodes[q.startOffset];
F.so=H.nodeType==1?null:0}else{H=q.startContainer.childNodes[q.startOffset-1];F.so=H.nodeType==1?null:H.nodeValue.length}}else{H=q.startContainer;F.so=q.startOffset}if(q.collapsed){if(z){if(p){H=f(H);if(!this.rte.dom.isEmpty(H)||(H=this.rte.dom.next(H))){F.nodes=[H]}if(this.rte.dom.isInline(H)){F.nodes=this.rte.dom.toLineStart(H).concat(F.nodes,this.rte.dom.toLineEnd(H))}if(F.nodes.length>0){F.so=F.nodes[0].nodeType==1?null:0;F.eo=F.nodes[F.nodes.length-1].nodeType==1?null:F.nodes[F.nodes.length-1].nodeValue.length
}}else{if(!this.rte.dom.isEmpty(H)){F.nodes=[H]}}}return F}if(q.endContainer.nodeType==1){E=q.endContainer.childNodes[q.endOffset-1];F.eo=E.nodeType==1?null:E.nodeValue.length}else{E=q.endContainer;F.eo=q.endOffset}if(H.nodeType==1||p||C(H,F.so,H.nodeValue.length)){H=f(H,w,"left");D=true;F.so=H.nodeType==1?null:0}if(E.nodeType==1||p||C(E,0,F.eo)){E=f(E,w,"right");B=true;F.eo=E.nodeType==1?null:E.nodeValue.length}if(p){if(H.nodeType!=1&&H.parentNode!=w&&H.parentNode.nodeName!="BODY"){H=H.parentNode;
F.so=null}if(E.nodeType!=1&&E.parentNode!=w&&E.parentNode.nodeName!="BODY"){E=E.parentNode;F.eo=null}}if(H.parentNode==E.parentNode&&H.parentNode.nodeName!="BODY"&&(D&&this.rte.dom.isFirstNotEmpty(H))&&(B&&this.rte.dom.isLastNotEmpty(E))){H=E=H.parentNode;F.so=H.nodeType==1?null:0;F.eo=E.nodeType==1?null:E.nodeValue.length}if(H==E){if(!this.rte.dom.isEmpty(H)){F.nodes.push(H)}return F}var t=H;while(t.nodeName!="BODY"&&t.parentNode!==w&&t.parentNode.nodeName!="BODY"){t=t.parentNode}var G=E;while(G.nodeName!="BODY"&&G.parentNode!==w&&G.parentNode.nodeName!="BODY"){G=G.parentNode
}if(!x(H,F.so,H.nodeType==3?H.nodeValue.length:null)){F.nodes.push(H)}var v=H;while(v!==t){var u=v;while((u=this.rte.dom.next(u))){F.nodes.push(u)}v=v.parentNode}v=t;while((v=this.rte.dom.next(v))&&v!=G){F.nodes.push(v)}var A=[];v=E;while(v!==G){var u=v;while((u=this.rte.dom.prev(u))){A.push(u)}v=v.parentNode}if(A.length){F.nodes=F.nodes.concat(A.reverse())}if(!x(E,0,E.nodeType==3?F.eo:null)){F.nodes.push(E)}if(p){if(this.rte.dom.isInline(H)){F.nodes=this.rte.dom.toLineStart(H).concat(F.nodes);F.so=F.nodes[0].nodeType==1?null:0
}if(this.rte.dom.isInline(E)){F.nodes=F.nodes.concat(this.rte.dom.toLineEnd(E));F.eo=F.nodes[F.nodes.length-1].nodeType==1?null:F.nodes[F.nodes.length-1].nodeValue.length}}return F}}})(jQuery);(function(a){elRTE.prototype.ui=function(f){this.rte=f;this._buttons=[];var v=this,o=this.rte.options.toolbars[f.options.toolbar&&f.options.toolbars[f.options.toolbar]?f.options.toolbar:"normal"],r=o.length,g,k,j,h,t,u,q;for(q in this.buttons){if(this.buttons.hasOwnProperty(q)&&q!="button"){this.buttons[q].prototype=this.buttons.button.prototype
}}while(r--){first=(r==0?true:false);if(o[r-1]=="eol"){first=true}k=o[r];if(k=="eol"){a(this.rte.doc.createElement("br")).prependTo(this.rte.toolbar);continue}g=a('<ul class="panel-'+k+(first?" first":"")+'" />').prependTo(this.rte.toolbar);g.bind("mousedown",function(b){b.preventDefault()});j=this.rte.options.panels[k].length;while(j--){h=this.rte.options.panels[k][j];t=this.buttons[h]||this.buttons.button;this._buttons.push((u=new t(this.rte,h)));g.prepend(u.domElem)}}this.update();this.disable=function(){a.each(v._buttons,function(){!this.active&&this.domElem.addClass("disabled")
})}};elRTE.prototype.ui.prototype.update=function(h){h&&this.rte.selection.cleanCache();var f=this.rte.selection.getNode(),c=this.rte.dom.parents(f,"*"),j=this.rte.rtl,q=j?" &laquo; ":" &raquo; ",o="",b,g;function k(r){var p=r.nodeName.toLowerCase();r=a(r);if(p=="img"){if(r.hasClass("elrte-media")){p="media"}else{if(r.hasClass("elrte-google-maps")){p="google map"}else{if(r.hasClass("elrte-yandex-maps")){p="yandex map"}else{if(r.hasClass("elrte-pagebreak")){p="pagebreak"}}}}}return p}if(f&&f.nodeType==1&&f.nodeName!="BODY"){c.unshift(f)
}if(!j){c=c.reverse()}for(g=0;g<c.length;g++){o+=(g>0?q:"")+k(c[g])}this.rte.statusbar.html(o);a.each(this._buttons,function(){this.update()});this.rte.window.focus()};elRTE.prototype.ui.prototype.buttons={button:function(f,c){var b=this;this.rte=f;this.active=false;this.name=c;this.val=null;this.domElem=a('<li style="-moz-user-select:-moz-none" class="'+c+' rounded-3" name="'+c+'" title="'+this.rte.i18n(this.rte.options.buttons[c]||c)+'" unselectable="on" />').hover(function(){a(this).addClass("hover")
},function(){a(this).removeClass("hover")}).click(function(g){g.stopPropagation();g.preventDefault();if(!a(this).hasClass("disabled")){b.command()}b.rte.window.focus()})}};elRTE.prototype.ui.prototype.buttons.button.prototype.command=function(){this.rte.history.add();try{this.rte.doc.execCommand(this.name,false,this.val)}catch(b){return this.rte.log("commands failed: "+this.name)}this.rte.ui.update(true)};elRTE.prototype.ui.prototype.buttons.button.prototype.update=function(){try{if(!this.rte.doc.queryCommandEnabled(this.name)){return this.domElem.addClass("disabled")
}else{this.domElem.removeClass("disabled")}}catch(b){return}try{if(this.rte.doc.queryCommandState(this.name)){this.domElem.addClass("active")}else{this.domElem.removeClass("active")}}catch(b){}}})(jQuery);(function(a){elRTE.prototype.utils=function(c){this.rte=c;this.url=null;this.reg=/^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/;this.baseURL="";this.path="";
this.entities={"&":"&amp;",'"':"&quot;","<":"&lt;",">":"&gt;"};this.entitiesRegExp=/[<>&\"]/g;this.media=[{type:"application/x-shockwave-flash",classid:["clsid:d27cdb6e-ae6d-11cf-96b8-444553540000"],codebase:"http://download.macromedia.com/pub/shockwave/cabs/flash/swflash.cab#version=6,0,40,0"},{type:"application/x-director",classid:["clsid:166b1bca-3f9c-11cf-8075-444553540000"],codebase:"http://download.macromedia.com/pub/shockwave/cabs/director/sw.cab#version=8,5,1,0"},{type:"application/x-mplayer2",classid:["clsid:6bf52a52-394a-11d3-b153-00c04f79faa6","clsid:22d6f312-b0f6-11d0-94ab-0080c74c7e95","clsid:05589fa1-c356-11ce-bf01-00aa0055595a"],codebase:"http://activex.microsoft.com/activex/controls/mplayer/en/nsmp2inf.cab#Version=5,1,52,701"},{type:"video/quicktime",classid:["clsid:02bf25d5-8c17-4b23-bc80-d3488abddc6b"],codebase:"http://www.apple.com/qtactivex/qtplugin.cab#version=6,0,2,0"},{type:"audio/x-pn-realaudio-plugin",classid:["clsid:cfcdaa03-8be4-11cf-b84b-0020afbbccfa"],codebase:"http://download.macromedia.com/pub/shockwave/cabs/flash/swflash.cab#version=6,0,40,0"}];
this.rgbRegExp=/\s*rgb\s*?\(\s*?([0-9]+)\s*?,\s*?([0-9]+)\s*?,\s*?([0-9]+)\s*?\)\s*/i;this.colorsRegExp=/aqua|black|blue|fuchsia|gray|green|lime|maroon|navy|olive|orange|purple|red|silver|teal|white|yellow|rgb\s*\([^\)]+\)/i;this.colors={aqua:"#00ffff",black:"#000000",blue:"#0000ff",fuchsia:"#ff00ff",gray:"#808080",green:"#008000",lime:"#00ff00",maroon:"#800000",navy:"#000080",olive:"#808000",orange:"#ffa500",purple:"#800080",red:"#ff0000",silver:"#c0c0c0",teal:"#008080",white:"#fffffff",yellow:"#ffff00"};
var b=this;this.rgb2hex=function(f){return this.color2Hex(""+f)};this.toPixels=function(g){var f=g.match(/([0-9]+\.?[0-9]*)\s*(px|pt|em|%)/);if(f){g=f[1];unit=f[2]}if(g[0]=="."){g="0"+g}g=parseFloat(g);if(isNaN(g)){return""}var h=parseInt(a(document.body).css("font-size"))||16;switch(unit){case"em":return parseInt(g*h);case"pt":return parseInt(g*h/12);case"%":return parseInt(g*h/100)}return g};this.absoluteURL=function(g){!this.url&&this._url();g=a.trim(g);if(!g){return""}if(g[0]=="#"){return g}var f=this.parseURL(g);
if(!f.host&&!f.path&&!f.anchor){return""}if(!this.rte.options.absoluteURLs){return g}if(f.protocol){return g}if(f.host&&(f.host.indexOf(".")!=-1||f.host=="localhost")){return this.url.protocol+"://"+g}if(g[0]=="/"){g=this.baseURL+g}else{if(g.indexOf("./")==0){g=g.substring(2)}g=this.baseURL+this.path+g}return g};this.parseURL=function(h){var g=h.match(this.reg);var f={};a.each(["source","protocol","authority","userInfo","user","password","host","port","relative","path","directory","file","query","anchor"],function(j){f[this]=g[j]
});if(!f.host.match(/[a-z0-9]/i)){f.host=""}return f};this.trimEventCallback=function(f){f=f?f.toString():"";return a.trim(f.replace(/\r*\n/mg,"").replace(/^function\s*on[a-z]+\s*\(\s*event\s*\)\s*\{(.+)\}$/igm,"$1"))};this._url=function(){this.url=this.parseURL(window.location.href);this.baseURL=this.url.protocol+"://"+(this.url.userInfo?parts.userInfo+"@":"")+this.url.host+(this.url.port?":"+this.url.port:"");this.path=!this.url.file?this.url.path:this.url.path.substring(0,this.url.path.length-this.url.file.length)
};this.makeObject=function(g){var f={};a.each(g,function(h,j){f[j]=j});return f};this.encode=function(f){var g=this.entities;return(""+f).replace(this.entitiesRegExp,function(h){return g[h]})};this.decode=function(f){return a("<div/>").html(f||"").text()};this.parseStyle=function(k){var h={},f=this.rte.options.allowBrowsersSpecStyles,j,q,g,o;if(typeof(k)=="string"&&k.length){a.each(k.replace(/&quot;/gi,"'").split(";"),function(p,r){if((o=r.indexOf(":"))!==-1){q=a.trim(r.substr(0,o));g=a.trim(r.substr(o+1));
if(q=="color"||q=="background-color"){g=g.toLowerCase()}if(q&&g&&(f||q.substring(0,1)!="-")){h[q]=g}}})}return h};this.compactStyle=function(g){var f=this;if(g.border=="medium none"){delete g.border}a.each(g,function(j,h){if(/color$/i.test(j)){g[j]=f.color2Hex(h)}else{if(/^(border|background)$/i.test(j)){g[j]=h.replace(f.colorsRegExp,function(k){return f.color2Hex(k)})}}});if(g["border-width"]){g.border=g["border-width"]+" "+(g["border-style"]||"solid")+" "+(g["border-color"]||"#000");delete g["border-width"];
delete g["border-style"];delete g["border-color"]}if(g["background-image"]){g.background=(g["background-color"]+" ")||""+g["background-image"]+" "+g["background-position"]||"0 0 "+g["background-repeat"]||"repeat";delete g["background-image"];delete ["background-image"];delete ["background-position"];delete ["background-repeat"]}if(g["margin-top"]&&g["margin-right"]&&g["margin-bottom"]&&g["margin-left"]){g.margin=g["margin-top"]+" "+g["margin-right"]+" "+g["margin-bottom"]+" "+g["margin-left"];delete g["margin-top"];
delete g["margin-right"];delete g["margin-bottom"];delete g["margin-left"]}if(g["padding-top"]&&g["padding-right"]&&g["padding-bottom"]&&g["padding-left"]){g.padding=g["padding-top"]+" "+g["padding-right"]+" "+g["padding-bottom"]+" "+g["padding-left"];delete g["padding-top"];delete g["padding-right"];delete g["padding-bottom"];delete g["padding-left"]}if(g["list-style-type"]||g["list-style-position"]||g["list-style-image"]){g["list-style"]=a.trim(g["list-style-type"]||" "+g["list-style-position"]||""+g["list-style-image"]||"");
delete g["list-style-type"];delete g["list-style-position"];delete g["list-style-image"]}return g};this.serializeStyle=function(g,h){var f=[];a.each(h?this.compactStyle(g):g,function(k,j){j&&f.push(k+":"+j)});return f.join(";")};this.parseClass=function(f){f=a.trim(f);return f.length?this.makeObject(f.split(/\s+/)):{};return f.length?f.split(/\s+/):[]};this.serializeClass=function(h){var g=[];var f=this.rte;a.each(h,function(j){g.push(j)});return g.join(" ")};this.mediaInfo=function(g,h){var f=this.media.length;
while(f--){if(g===this.media[f].type||(h&&a.inArray(h,this.media[f].classid)!=-1)){return this.media[f]}}};this.color2Hex=function(h){var f;h=h||"";if(h.indexOf("#")===0){return h}function g(j){j=parseInt(j).toString(16);return j.length>1?j:"0"+j}if(this.colors[h]){return this.colors[h]}if((f=h.match(this.rgbRegExp))){return"#"+g(f[1])+g(f[2])+g(f[3])}return""}}})(jQuery);(function(a){elRTE.prototype.w3cRange=function(c){var b=this;this.rte=c;this.r=null;this.collapsed=true;this.startContainer=null;
this.endContainer=null;this.startOffset=0;this.endOffset=0;this.commonAncestorContainer=null;this.range=function(){try{this.r=this.rte.window.document.selection.createRange()}catch(f){this.r=this.rte.doc.body.createTextRange()}return this.r};this.insertNode=function(f){this.range();b.r.collapse(false);var g=b.r.duplicate();g.pasteHTML(f)};this.getBookmark=function(){this.range();if(this.r.item){var f=this.r.item(0);this.r=this.rte.doc.body.createTextRange();this.r.moveToElementText(f)}return this.r.getBookmark()
};this.moveToBookmark=function(f){this.rte.window.focus();this.range().moveToBookmark(f);this.r.select()};this.update=function(){function h(x){var k="\uFEFF";var o=offset=0;var t=b.r.duplicate();t.collapse(x);var u=t.parentElement();if(!u||u.nodeName=="HTML"){return{parent:b.rte.doc.body,ndx:o,offset:offset}}t.pasteHTML(k);childs=u.childNodes;for(var q=0;q<childs.length;q++){var w=childs[q];if(q>0&&(w.nodeType!==3||childs[q-1].nodeType!==3)){o++}if(w.nodeType!==3){offset=0}else{var v=w.nodeValue.indexOf(k);
if(v!==-1){offset+=v;break}offset+=w.nodeValue.length}}t.moveStart("character",-1);t.text="";return{parent:u,ndx:Math.min(o,u.childNodes.length-1),offset:offset}}this.range();this.startContainer=this.endContainer=null;if(this.r.item){this.collapsed=false;var g=this.r.item(0);this.setStart(g.parentNode,this.rte.dom.indexOf(g));this.setEnd(g.parentNode,this.startOffset+1)}else{this.collapsed=this.r.boundingWidth==0;var j=h(true);var f=h(false);j.parent.normalize();f.parent.normalize();j.ndx=Math.min(j.ndx,j.parent.childNodes.length-1);
f.ndx=Math.min(f.ndx,f.parent.childNodes.length-1);if(j.parent.childNodes[j.ndx].nodeType&&j.parent.childNodes[j.ndx].nodeType==1){this.setStart(j.parent,j.ndx)}else{this.setStart(j.parent.childNodes[j.ndx],j.offset)}if(f.parent.childNodes[f.ndx].nodeType&&f.parent.childNodes[f.ndx].nodeType==1){this.setEnd(f.parent,f.ndx)}else{this.setEnd(f.parent.childNodes[f.ndx],f.offset)}this.select()}return this};this.isCollapsed=function(){this.range();this.collapsed=this.r.item?false:this.r.boundingWidth==0;
return this.collapsed};this.collapse=function(f){this.range();if(this.r.item){var g=this.r.item(0);this.r=this.rte.doc.body.createTextRange();this.r.moveToElementText(g)}this.r.collapse(f);this.r.select();this.collapsed=true};this.getStart=function(){this.range();if(this.r.item){return this.r.item(0)}var g=this.r.duplicate();g.collapse(true);var f=g.parentElement();return f&&f.nodeName=="BODY"?f.firstChild:f};this.getEnd=function(){this.range();if(this.r.item){return this.r.item(0)}var f=this.r.duplicate();
f.collapse(false);var g=f.parentElement();return g&&g.nodeName=="BODY"?g.lastChild:g};this.setStart=function(f,g){this.startContainer=f;this.startOffset=g;if(this.endContainer){this.commonAncestorContainer=this.rte.dom.findCommonAncestor(this.startContainer,this.endContainer)}};this.setEnd=function(f,g){this.endContainer=f;this.endOffset=g;if(this.startContainer){this.commonAncestorContainer=this.rte.dom.findCommonAncestor(this.startContainer,this.endContainer)}};this.setStartBefore=function(f){if(f.parentNode){this.setStart(f.parentNode,this.rte.dom.indexOf(f))
}};this.setStartAfter=function(f){if(f.parentNode){this.setStart(f.parentNode,this.rte.dom.indexOf(f)+1)}};this.setEndBefore=function(f){if(f.parentNode){this.setEnd(f.parentNode,this.rte.dom.indexOf(f))}};this.setEndAfter=function(f){if(f.parentNode){this.setEnd(f.parentNode,this.rte.dom.indexOf(f)+1)}};this.select=function(){function o(B,z){if(B.nodeType!=3){return -1}var A="\uFEFF";var x=B.nodeValue;var v=b.rte.doc.body.createTextRange();B.nodeValue=x.substring(0,z)+A+x.substring(z);v.moveToElementText(B.parentNode);
v.findText(A);var w=Math.abs(v.moveStart("character",-1048575));B.nodeValue=x;return w}this.r=this.rte.doc.body.createTextRange();var k=this.startOffset;var g=this.endOffset;var u=this.startContainer.nodeType==1?this.startContainer.childNodes[Math.min(k,this.startContainer.childNodes.length-1)]:this.startContainer;var q=this.endContainer.nodeType==1?this.endContainer.childNodes[Math.min(k==g?g:g-1,this.endContainer.childNodes.length-1)]:this.endContainer;if(this.collapsed){if(u.nodeType==3){var h=o(u,k);
this.r.move("character",h)}else{this.r.moveToElementText(u);this.r.collapse(true)}}else{var f=this.rte.doc.body.createTextRange();var j=o(u,k);var t=o(q,g);if(u.nodeType==3){this.r.move("character",j)}else{this.r.moveToElementText(u)}if(q.nodeType==3){f.move("character",t)}else{f.moveToElementText(q)}this.r.setEndPoint("EndToEnd",f)}try{this.r.select()}catch(q){}if(f){f=null}};this.dump=function(){this.rte.log("collapsed: "+this.collapsed);this.rte.log("startContainer: "+(this.startContainer?this.startContainer.nodeName:"non"));
this.rte.log("startOffset: "+this.startOffset);this.rte.log("endContainer: "+(this.endContainer?this.endContainer.nodeName:"none"));this.rte.log("endOffset: "+this.endOffset)}}})(jQuery);(function(a){elRTE.prototype.ui.prototype.buttons.about=function(c,b){this.constructor.prototype.constructor.call(this,c,b);this.active=true;this.command=function(){var g,h,f;g={rtl:c.rtl,submit:function(j,k){k.close()},dialog:{width:560,title:this.rte.i18n("About this software"),buttons:{Ok:function(){a(this).dialog("destroy")
}}}};f='<div class="elrte-logo"></div><h3>'+this.rte.i18n("About elRTE")+'</h3><br clear="all"/><div class="elrte-ver">'+this.rte.i18n("Version")+": "+this.rte.version+" ("+this.rte.build+')</div><div class="elrte-ver">jQuery: '+a("<div/>").jquery+'</div><div class="elrte-ver">jQueryUI: '+a.ui.version+'</div><div class="elrte-ver">'+this.rte.i18n("Licence")+": BSD Licence</div><p>"+this.rte.i18n("elRTE is an open-source JavaScript based WYSIWYG HTML-editor.")+"<br/>"+this.rte.i18n("Main goal of the editor - simplify work with text and formating (HTML) on sites, blogs, forums and other online services.")+"<br/>"+this.rte.i18n("You can use it in any commercial or non-commercial projects.")+"</p><h4>"+this.rte.i18n("Authors")+'</h4><table class="elrte-authors"><tr><td>Dmitry (dio) Levashov &lt;dio@std42.ru&gt;</td><td>'+this.rte.i18n("Chief developer")+"</td></tr><tr><td>Troex Nevelin &lt;troex@fury.scancode.ru&gt;</td><td>"+this.rte.i18n("Developer, tech support")+"</td></tr><tr><td>Valentin Razumnyh &lt;content@std42.ru&gt;</td><td>"+this.rte.i18n("Interface designer")+"</td></tr><tr><td>Tawfek Daghistani &lt;tawfekov@gmail.com&gt;</td><td>"+this.rte.i18n("RTL support")+"</td></tr>"+(this.rte.options.lang!="en"?"<tr><td>"+this.rte.i18n("_translator")+"</td><td>"+this.rte.i18n("_translation")+"</td></tr>":"")+'</table><div class="elrte-copy">Copyright &copy; 2009-2011, <a href="http://www.std42.ru">Studio 42</a></div><div class="elrte-copy">'+this.rte.i18n("For more information about this software visit the")+' <a href="http://elrte.org">'+this.rte.i18n("elRTE website")+'.</a></div><div class="elrte-copy">Twitter: <a href="http://twitter.com/elrte_elfinder">elrte_elfinder</a></div>';
h=new elDialogForm(g);h.append(f);h.open()};this.update=function(){this.domElem.removeClass("disabled")}}})(jQuery);(function(a){elRTE.prototype.ui.prototype.buttons.anchor=function(f,c){this.constructor.prototype.constructor.call(this,f,c);this.input=a('<input type="text" />').attr("name","anchor").attr("size","16");var b=this;this.command=function(){var g={rtl:this.rte.rtl,submit:function(j,k){j.stopPropagation();j.preventDefault();k.close();b.set()},dialog:{title:this.rte.i18n("Bookmark")}};this.anchor=this.rte.dom.selfOrParentAnchor(this.rte.selection.getEnd())||f.dom.create("a");
!this.rte.selection.collapsed()&&this.rte.selection.collapse(false);this.input.val(a(this.anchor).addClass("elrte-anchor").attr("name"));this.rte.selection.saveIERange();var h=new elDialogForm(g);h.append([this.rte.i18n("Bookmark name"),this.input],null,true).open();setTimeout(function(){b.input.focus()},20)};this.update=function(){var g=this.rte.selection.getNode();if(this.rte.dom.selfOrParentLink(g)){this.domElem.addClass("disabled")}else{if(this.rte.dom.selfOrParentAnchor(g)){this.domElem.removeClass("disabled").addClass("active")
}else{this.domElem.removeClass("disabled").removeClass("active")}}};this.set=function(){var g=a.trim(this.input.val());if(g){this.rte.history.add();if(!this.anchor.parentNode){this.rte.selection.insertHtml('<a name="'+g+'" title="'+this.rte.i18n("Bookmark")+": "+g+'" class="elrte-anchor"></a>')}else{this.anchor.name=g;this.anchor.title=this.rte.i18n("Bookmark")+": "+g}}else{if(this.anchor.parentNode){this.rte.history.add();this.anchor.parentNode.removeChild(this.anchor)}}}}})(jQuery);(function(a){elRTE.prototype.ui.prototype.buttons.blockquote=function(c,b){this.constructor.prototype.constructor.call(this,c,b);
this.command=function(){var g,f;this.rte.history.add();if(this.rte.selection.collapsed()&&(g=this.rte.dom.selfOrParent(this.rte.selection.getNode(),/^BLOCKQUOTE$/))){a(g).replaceWith(a(g).html())}else{f=this.rte.selection.selected({wrap:"all",tag:"blockquote"});f.length&&this.rte.selection.select(f[0],f[f.length-1])}this.rte.ui.update(true)};this.update=function(){if(this.rte.selection.collapsed()){if(this.rte.dom.selfOrParent(this.rte.selection.getNode(),/^BLOCKQUOTE$/)){this.domElem.removeClass("disabled").addClass("active")
}else{this.domElem.addClass("disabled").removeClass("active")}}else{this.domElem.removeClass("disabled active")}}}})(jQuery);(function(a){elRTE.prototype.ui.prototype.buttons.copy=function(c,b){this.constructor.prototype.constructor.call(this,c,b);this.command=function(){if(this.rte.browser.mozilla){try{this.rte.doc.execCommand(this.name,false,null)}catch(h){var f=" Ctl + C";if(this.name=="cut"){f=" Ctl + X"}else{if(this.name=="paste"){f=" Ctl + V"}}var g={dialog:{title:this.rte.i18n("Warning"),buttons:{Ok:function(){a(this).dialog("close")
}}}};var j=new elDialogForm(g);j.append(this.rte.i18n("This operation is disabled in your browser on security reason. Use shortcut instead.")+": "+f).open()}}else{this.constructor.prototype.command.call(this)}}};elRTE.prototype.ui.prototype.buttons.cut=elRTE.prototype.ui.prototype.buttons.copy;elRTE.prototype.ui.prototype.buttons.paste=elRTE.prototype.ui.prototype.buttons.copy})(jQuery);(function(a){elRTE.prototype.ui.prototype.buttons.css=function(f,c){var b=this;this.constructor.prototype.constructor.call(this,f,c);
this.cssStyle=a('<input type="text" size="42" name="style" />');this.cssClass=a('<input type="text" size="42" name="class" />');this.elementID=a('<input type="text" size="42" name="id" />');this.command=function(){var j=this.node(),g;this.rte.selection.saveIERange();if(j){var g={submit:function(k,o){k.stopPropagation();k.preventDefault();o.close();b.set()},dialog:{title:this.rte.i18n("Style"),width:450,resizable:true,modal:true}};this.cssStyle.val(a(j).attr("style"));this.cssClass.val(a(j).attr("class"));
this.elementID.val(a(j).attr("id"));var h=new elDialogForm(g);h.append([this.rte.i18n("Css style"),this.cssStyle],null,true);h.append([this.rte.i18n("Css class"),this.cssClass],null,true);h.append([this.rte.i18n("ID"),this.elementID],null,true);h.open();setTimeout(function(){b.cssStyle.focus()},20)}};this.set=function(){var g=this.node();this.rte.selection.restoreIERange();if(g){a(g).attr("style",this.cssStyle.val());a(g).attr("class",this.cssClass.val());a(g).attr("id",this.elementID.val());this.rte.ui.update()
}};this.node=function(){var g=this.rte.selection.getNode();if(g.nodeType==3){g=g.parentNode}return g.nodeType==1&&g.nodeName!="BODY"?g:null};this.update=function(){this.domElem.toggleClass("disabled",this.node()?false:true)}}})(jQuery);(function(a){elRTE.prototype.ui.prototype.buttons.rtl=function(f,c){this.constructor.prototype.constructor.call(this,f,c);var b=this;this.command=function(){var h=this.rte.selection.getNode(),g=this;if(a(h).attr("dir")=="rtl"||a(h).parents('[dir="rtl"]').length||a(h).find('[dir="rtl"]').length){a(h).removeAttr("dir");
a(h).parents('[dir="rtl"]').removeAttr("dir");a(h).find('[dir="rtl"]').removeAttr("dir")}else{if(this.rte.dom.is(h,"textNodes")&&this.rte.dom.is(h,"block")){a(h).attr("dir","rtl")}else{a.each(this.rte.dom.parents(h,"textNodes"),function(j,k){if(g.rte.dom.is(k,"block")){a(k).attr("dir","rtl");return false}})}}this.rte.ui.update()};this.update=function(){var g=this.rte.selection.getNode();this.domElem.removeClass("disabled");if(a(g).attr("dir")=="rtl"||a(g).parents('[dir="rtl"]').length||a(g).find('[dir="rtl"]').length){this.domElem.addClass("active")
}else{this.domElem.removeClass("active")}}};elRTE.prototype.ui.prototype.buttons.ltr=function(f,c){this.constructor.prototype.constructor.call(this,f,c);var b=this;this.command=function(){var h=this.rte.selection.getNode(),g=this;if(a(h).attr("dir")=="ltr"||a(h).parents('[dir="ltr"]').length||a(h).find('[dir="ltr"]').length){a(h).removeAttr("dir");a(h).parents('[dir="ltr"]').removeAttr("dir");a(h).find('[dir="ltr"]').removeAttr("dir")}else{if(this.rte.dom.is(h,"textNodes")&&this.rte.dom.is(h,"block")){a(h).attr("dir","ltr")
}else{a.each(this.rte.dom.parents(h,"textNodes"),function(j,k){if(g.rte.dom.is(k,"block")){a(k).attr("dir","ltr");return false}})}}this.rte.ui.update()};this.update=function(){var g=this.rte.selection.getNode();this.domElem.removeClass("disabled");if(a(g).attr("dir")=="ltr"||a(g).parents('[dir="ltr"]').length||a(g).find('[dir="ltr"]').length){this.domElem.addClass("active")}else{this.domElem.removeClass("active")}}}})(jQuery);(function(a){elRTE.prototype.ui.prototype.buttons.div=function(c,b){this.constructor.prototype.constructor.call(this,c,b);
this.command=function(){var g,f;this.rte.history.add();if(this.rte.selection.collapsed()){g=this.rte.dom.selfOrParent(this.rte.selection.getNode(),/^DIV$/);if(g){a(g).replaceWith(a(g).html())}}else{f=this.rte.selection.selected({wrap:"all",tag:"div"});f.length&&this.rte.selection.select(f[0],f[f.length-1])}this.rte.ui.update(true)};this.update=function(){if(this.rte.selection.collapsed()){if(this.rte.dom.selfOrParent(this.rte.selection.getNode(),/^DIV$/)){this.domElem.removeClass("disabled").addClass("active")
}else{this.domElem.addClass("disabled active")}}else{this.domElem.removeClass("disabled active")}}}})(jQuery);(function(a){elRTE.prototype.ui.prototype.buttons.docstructure=function(c,b){this.constructor.prototype.constructor.call(this,c,b);this.command=function(){this.domElem.toggleClass("active");a(this.rte.doc.body).toggleClass("el-rte-structure")};this.command();this.update=function(){this.domElem.removeClass("disabled")}}})(jQuery);(function(a){elRTE.prototype.ui.prototype.buttons.elfinder=function(f,c){this.constructor.prototype.constructor.call(this,f,c);
var b=this,f=this.rte;this.command=function(){if(b.rte.options.fmAllow&&typeof(b.rte.options.fmOpen)=="function"){b.rte.options.fmOpen(function(h){var g=decodeURIComponent(h.split("/").pop().replace(/\+/g," "));if(f.selection.collapsed()){f.selection.insertHtml('<a href="'+h+'" >'+g+"</a>")}else{f.doc.execCommand("createLink",false,h)}})}};this.update=function(){if(b.rte.options.fmAllow&&typeof(b.rte.options.fmOpen)=="function"){this.domElem.removeClass("disabled")}else{this.domElem.addClass("disabled")
}}}})(jQuery);(function(a){elRTE.prototype.ui.prototype.buttons.flash=function(f,c){this.constructor.prototype.constructor.call(this,f,c);var b=this;this.swf=null;this.placeholder=null;this.src={url:a('<input type="text" name="url" />').css("width","99%"),type:a('<select name="type"/>').append('<option value="application/x-shockwave-flash">Flash</option>').append('<option value="video/quicktime">Quicktime movie</option>').append('<option value="application/x-mplayer2">Windows media</option>'),width:a('<input type="text" />').attr("size",5).css("text-align","right"),height:a('<input type="text" />').attr("size",5).css("text-align","right"),wmode:a("<select />").append(a("<option />").val("").text(this.rte.i18n("Not set","dialogs"))).append(a("<option />").val("transparent").text(this.rte.i18n("Transparent"))),align:a("<select />").append(a("<option />").val("").text(this.rte.i18n("Not set","dialogs"))).append(a("<option />").val("left").text(this.rte.i18n("Left"))).append(a("<option />").val("right").text(this.rte.i18n("Right"))).append(a("<option />").val("top").text(this.rte.i18n("Top"))).append(a("<option />").val("text-top").text(this.rte.i18n("Text top"))).append(a("<option />").val("middle").text(this.rte.i18n("middle"))).append(a("<option />").val("baseline").text(this.rte.i18n("Baseline"))).append(a("<option />").val("bottom").text(this.rte.i18n("Bottom"))).append(a("<option />").val("text-bottom").text(this.rte.i18n("Text bottom"))),margin:a("<div />")};
this.command=function(){var r=this.rte.selection.getEnd(),j,k="",B="",t="",v,z,x,A,q,C;this.rte.selection.saveIERange();this.src.margin.elPaddingInput({type:"margin"});this.placeholder=null;this.swf=null;if(a(r).hasClass("elrte-media")&&(A=a(r).attr("rel"))&&this.rte.filter.scripts[A]){this.placeholder=a(r);q=this.rte.filter.scripts[A];k="";if(q.embed&&q.embed.src){k=q.embed.src}if(q.params&&q.params.length){l=q.params.length;while(l--){if(q.params[l].name=="src"||q.params[l].name=="movie"){k=q.params[l].value
}}}if(q.embed){B=q.embed.width||parseInt(q.embed.style.width)||"";t=q.embed.height||parseInt(q.embed.style.height)||"";C=q.embed.wmode||""}else{if(q.obj){B=q.obj.width||parseInt(q.obj.style.width)||"";t=q.obj.height||parseInt(q.obj.style.height)||"";C=q.obj.wmode||""}}if(q.obj){v=q.obj.style["float"]||"";z=q.obj.style["vertical-align"]||""}else{if(q.embed){v=q.embed.style["float"]||"";z=q.embed.style["vertical-align"]||""}}this.src.margin.val(r);this.src.type.val(q.embed?q.embed.type:"")}if(a(r).hasClass("elrte-swf-placeholder")){this.placeholder=a(r);
k=a(r).attr("rel");B=parseInt(a(r).css("width"))||"";t=parseInt(a(r).css("height"))||"";v=a(r).css("float");z=a(r).css("vertical-align");this.src.margin.val(r);this.src.wmode.val(a(r).attr("wmode"))}this.src.url.val(k);this.src.width.val(B);this.src.height.val(t);this.src.align.val(v||z);this.src.wmode.val(C);var j={rtl:this.rte.rtl,submit:function(h,o){h.stopPropagation();h.preventDefault();b.set();o.close()},dialog:{width:580,position:"top",title:this.rte.i18n("Flash")}};var x=new elDialogForm(j);
if(this.rte.options.fmAllow&&this.rte.options.fmOpen){var g=a("<span />").append(this.src.url.css("width","85%")).append(a("<span />").addClass("ui-state-default ui-corner-all").css({"float":"right","margin-right":"3px"}).attr("title",b.rte.i18n("Open file manger")).append(a("<span />").addClass("ui-icon ui-icon-folder-open")).click(function(){b.rte.options.fmOpen(function(h){b.src.url.val(h).change()})}).hover(function(){a(this).addClass("ui-state-hover")},function(){a(this).removeClass("ui-state-hover")
}))}else{var g=this.src.url}x.append([this.rte.i18n("URL"),g],null,true);x.append([this.rte.i18n("Type"),this.src.type],null,true);x.append([this.rte.i18n("Size"),a("<span />").append(this.src.width).append(" x ").append(this.src.height).append(" px")],null,true);x.append([this.rte.i18n("Wmode"),this.src.wmode],null,true);x.append([this.rte.i18n("Alignment"),this.src.align],null,true);x.append([this.rte.i18n("Margins"),this.src.margin],null,true);x.open();var u=a("<fieldset />").append(a("<legend />").text(this.rte.i18n("Preview")));
x.append(u,"main");var p=document.createElement("iframe");a(p).attr("src","#").addClass("el-rte-preview").appendTo(u);html=this.rte.options.doctype+'<html xmlns="http://www.w3.org/1999/xhtml"><head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8" /></head><body style="padding:0;margin:0;font-size:9px"> Proin elit arcu, rutrum commodo, vehicula tempus, commodo a, risus. Curabitur nec arcu. Donec sollicitudin mi sit amet mauris. Nam elementum quam ullamcorper ante. Etiam aliquet massa et lorem. Mauris dapibus lacus auctor risus. Aenean tempor ullamcorper leo. Vivamus sed magna quis ligula eleifend adipiscing. Duis orci. Aliquam sodales tortor vitae ipsum. Aliquam nulla. Duis aliquam molestie erat. Ut et mauris vel pede varius sollicitudin</body></html>';
p.contentWindow.document.open();p.contentWindow.document.write(html);p.contentWindow.document.close();this.frame=p.contentWindow.document;this.preview=a(p.contentWindow.document.body);this.src.type.change(function(){b.src.url.change()});this.src.width.change(function(){if(b.swf){var h=parseInt(a(this).val())||"";a(this).val(h);b.swf.css("width",h);b.swf.children("embed").css("width",h)}else{a(this).val("")}});this.src.height.change(function(){if(b.swf){var o=parseInt(a(this).val())||"";a(this).val(o);
b.swf.css("height",o);b.swf.children("embed").css("height",o)}else{a(this).val("")}});this.src.wmode.change(function(){if(b.swf){var h=a(this).val();if(h){b.swf.attr("wmode",h);b.swf.children("embed").attr("wmode",h)}else{b.swf.removeAttr("wmode");b.swf.children("embed").removeAttr("wmode")}}});this.src.align.change(function(){var h=a(this).val(),o=h=="left"||h=="right";if(b.swf){b.swf.css({"float":o?h:"","vertical-align":o?"":h})}else{a(this).val("")}});this.src.margin.change(function(){if(b.swf){var h=b.src.margin.val();
if(h.css){b.swf.css("margin",h.css)}else{b.swf.css("margin-top",h.top);b.swf.css("margin-right",h.right);b.swf.css("margin-bottom",h.bottom);b.swf.css("margin-left",h.left)}}});this.src.url.change(function(){var h=b.rte.utils.absoluteURL(a(this).val()),o,w;if(h){o=b.rte.utils.mediaInfo(b.src.type.val());if(!o){o=b.rte.util.mediaInfo("application/x-shockwave-flash")}w='<object classid="'+o.classid+'" codebase="'+o.codebase+'"><param name="src" value="'+h+'" /><embed quality="high" src="'+h+'" type="'+o.type+'"></object>';
b.preview.children("object").remove().end().prepend(w);b.swf=b.preview.children("object").eq(0)}else{if(b.swf){b.swf.remove();b.swf=null}}b.src.width.trigger("change");b.src.height.trigger("change");b.src.align.trigger("change")}).trigger("change")};this.set=function(){b.swf=null;var g=this.rte.utils.absoluteURL(this.src.url.val()),B=parseInt(this.src.width.val())||"",t=parseInt(this.src.height.val())||"",C=this.src.wmode.val(),z=this.src.align.val(),v=z=="left"||z=="right"?z:"",A=this.placeholder?this.placeholder.attr("rel"):"",p,k,x,q=this.src.margin.val(),r;
if(!g){if(this.placeholder){this.placeholder.remove();delete this.rte.filter.scripts[A]}}else{i=b.rte.utils.mediaInfo(b.src.type.val());if(!i){i=b.rte.util.mediaInfo("application/x-shockwave-flash")}x=this.rte.filter.videoHostRegExp.test(g)?g.replace(this.rte.filter.videoHostRegExp,"$2"):i.type.replace(/^\w+\/(.+)/,"$1");p={obj:{classid:i.classid[0],codebase:i.codebase,style:{}},params:[{name:"src",value:g}],embed:{src:g,type:i.type,quality:"high",wmode:C,style:{}}};if(B){p.obj.width=B;p.embed.width=B
}if(t){p.obj.height=t;p.embed.height=t}if(v){p.obj.style["float"]=v}else{if(z){p.obj.style["vertical-align"]=z}}if(q.css){r={margin:q.css}}else{r={"margin-top":q.top,"margin-right":q.right,"margin-bottom":q.bottom,"margin-left":q.left}}p.obj.style=a.extend({},p.obj.style,r);if(this.placeholder&&A){k=this.rte.filter.scripts[A]||{};p=a.extend(true,k,p);delete p.obj.style.width;delete p.obj.style.height;delete p.embed.style.width;delete p.embed.style.height;this.rte.filter.scripts[A]=p;this.placeholder.removeAttr("class")
}else{var j="media"+Math.random().toString().substring(2);this.rte.filter.scripts[j]=p;this.placeholder=a(this.rte.dom.create("img")).attr("rel",j).attr("src",this.rte.filter.url+"pixel.gif");var u=true}this.placeholder.attr("title",this.rte.utils.encode(g)).attr("width",B||150).attr("height",t||100).addClass("elrte-protected elrte-media elrte-media-"+x).css(p.obj.style);if(v){this.placeholder.css("float",v).css("vertical-align","")}else{if(z){this.placeholder.css("float","").css("vertical-align",z)
}else{this.placeholder.css("float","").css("vertical-align","")}}if(u){this.rte.window.focus();this.rte.selection.restoreIERange();this.rte.selection.insertNode(this.placeholder.get(0))}}};this.update=function(){this.domElem.removeClass("disabled");var g=this.rte.selection.getNode();this.domElem.toggleClass("active",g&&g.nodeName=="IMG"&&a(g).hasClass("elrte-media"))}}})(jQuery);(function(a){elRTE.prototype.ui.prototype.buttons.fontname=function(f,c){this.constructor.prototype.constructor.call(this,f,c);
var b=this;var g={tpl:'<span style="font-family:%val">%label</span>',select:function(h){b.set(h)},src:{"":this.rte.i18n("Font"),"andale mono,sans-serif":"Andale Mono","arial,helvetica,sans-serif":"Arial","arial black,gadget,sans-serif":"Arial Black","book antiqua,palatino,sans-serif":"Book Antiqua","comic sans ms,cursive":"Comic Sans MS","courier new,courier,monospace":"Courier New","georgia,palatino,serif":"Georgia","helvetica,sans-serif":"Helvetica","impact,sans-serif":"Impact","lucida console,monaco,monospace":"Lucida console","lucida sans unicode,lucida grande,sans-serif":"Lucida grande","tahoma,sans-serif":"Tahoma","times new roman,times,serif":"Times New Roman","trebuchet ms,lucida grande,verdana,sans-serif":"Trebuchet MS","verdana,geneva,sans-serif":"Verdana"}};
this.select=this.domElem.elSelect(g);this.command=function(){};this.set=function(j){this.rte.history.add();var h=this.rte.selection.selected({filter:"textContainsNodes"});a.each(h,function(){$this=/^(THEAD|TFOOT|TBODY|COL|COLGROUP|TR)$/.test(this.nodeName)?a(this).find("td,th"):a(this);a(this).css("font-family",j).find("[style]").css("font-family","")});this.rte.ui.update()};this.update=function(){this.domElem.removeClass("disabled");var j=this.rte.selection.getNode();if(j.nodeType!=1){j=j.parentNode
}var h=a(j).css("font-family");h=h?h.toString().toLowerCase().replace(/,\s+/g,",").replace(/'|"/g,""):"";this.select.val(g.src[h]?h:"")}}})(jQuery);(function(a){elRTE.prototype.ui.prototype.buttons.fontsize=function(f,c){this.constructor.prototype.constructor.call(this,f,c);var b=this;var g={labelTpl:"%label",tpl:'<span style="font-size:%val;line-height:1.2em">%label</span>',select:function(h){b.set(h)},src:{"":this.rte.i18n("Font size"),"xx-small":this.rte.i18n("Small (8pt)"),"x-small":this.rte.i18n("Small (10px)"),small:this.rte.i18n("Small (12pt)"),medium:this.rte.i18n("Normal (14pt)"),large:this.rte.i18n("Large (18pt)"),"x-large":this.rte.i18n("Large (24pt)"),"xx-large":this.rte.i18n("Large (36pt)")}};
this.select=this.domElem.elSelect(g);this.command=function(){};this.set=function(j){this.rte.history.add();var h=this.rte.selection.selected({filter:"textContainsNodes"});a.each(h,function(){$this=/^(THEAD|TFOOT|TBODY|COL|COLGROUP|TR)$/.test(this.nodeName)?a(this).find("td,th"):a(this);$this.css("font-size",j).find("[style]").css("font-size","")});this.rte.ui.update()};this.update=function(){this.domElem.removeClass("disabled");var h=this.rte.selection.getNode();this.select.val((m=this.rte.dom.attr(h,"style").match(/font-size:\s*([^;]+)/i))?m[1]:"")
}}})(jQuery);(function(a){elRTE.prototype.ui.prototype.buttons.forecolor=function(f,c){var b=this;this.constructor.prototype.constructor.call(this,f,c);var g={"class":"",palettePosition:"outer",color:this.defaultColor,update:function(h){b.indicator.css("background-color",h)},change:function(h){b.set(h)}};this.defaultColor=this.name=="forecolor"?"#000000":"#ffffff";this.picker=this.domElem.elColorPicker(g);this.indicator=a("<div />").addClass("color-indicator").prependTo(this.domElem);this.command=function(){};
this.set=function(k){if(!this.rte.selection.collapsed()){this.rte.history.add();var h=this.rte.selection.selected({collapse:false,wrap:"text"}),j=this.name=="forecolor"?"color":"background-color";a.each(h,function(){if(/^(THEAD|TBODY|TFOOT|TR)$/.test(this.nodeName)){a(this).find("td,th").each(function(){a(this).css(j,k).find("*").css(j,"")})}else{a(this).css(j,k).find("*").css(j,"")}});this.rte.ui.update(true)}};this.update=function(){this.domElem.removeClass("disabled");var h=this.rte.selection.getNode();
this.picker.val(this.rte.utils.rgb2hex(a(h.nodeType!=1?h.parentNode:h).css(this.name=="forecolor"?"color":"background-color"))||this.defaultColor)}};elRTE.prototype.ui.prototype.buttons.hilitecolor=elRTE.prototype.ui.prototype.buttons.forecolor})(jQuery);(function(a){elRTE.prototype.ui.prototype.buttons.formatblock=function(f,c){this.constructor.prototype.constructor.call(this,f,c);var h=this.rte.browser.msie?function(j){b.val=j;b.constructor.prototype.command.call(b)}:function(j){b.ieCommand(j)};
var b=this;var g={labelTpl:"%label",tpls:{"":"%label"},select:function(j){b.formatBlock(j)},src:{span:this.rte.i18n("Format"),h1:this.rte.i18n("Heading 1"),h2:this.rte.i18n("Heading 2"),h3:this.rte.i18n("Heading 3"),h4:this.rte.i18n("Heading 4"),h5:this.rte.i18n("Heading 5"),h6:this.rte.i18n("Heading 6"),p:this.rte.i18n("Paragraph"),address:this.rte.i18n("Address"),pre:this.rte.i18n("Preformatted"),div:this.rte.i18n("Normal (DIV)")}};this.select=this.domElem.elSelect(g);this.command=function(){};
this.formatBlock=function(u){function t(z,v){function x(A){a(A).find("h1,h2,h3,h4,h5,h6,p,address,pre").each(function(){a(this).replaceWith(a(this).html())});return A}if(/^(LI|DT|DD|TD|TH|CAPTION)$/.test(z.nodeName)){!b.rte.dom.isEmpty(z)&&b.rte.dom.wrapContents(x(z),v)}else{if(/^(UL|OL|DL|TABLE)$/.test(z.nodeName)){b.rte.dom.wrap(z,v)}else{!b.rte.dom.isEmpty(z)&&a(x(z)).replaceWith(a(b.rte.dom.create(v)).html(a(z).html()))}}}this.rte.history.add();var w=u.toUpperCase(),p,o,r,q=this.rte.selection.collapsed(),k=this.rte.selection.getBookmark(),j=this.rte.selection.selected({collapsed:true,blocks:true,filter:"textContainsNodes",wrap:"inline",tag:"span"});
l=j.length,s=a(j[0]).prev(),e=a(j[j.length-1]).next();while(l--){o=j[l];r=a(o);if(w=="DIV"||w=="SPAN"){if(/^(H[1-6]|P|ADDRESS|PRE)$/.test(o.nodeName)){r.replaceWith(a(this.rte.dom.create("div")).html(r.html()||""))}}else{if(/^(THEAD|TBODY|TFOOT|TR)$/.test(o.nodeName)){r.find("td,th").each(function(){t(this,w)})}else{if(o.nodeName!=w){t(o,w)}}}}this.rte.selection.moveToBookmark(k);this.rte.ui.update(true)};this.update=function(){this.domElem.removeClass("disabled");var j=this.rte.dom.selfOrParent(this.rte.selection.getNode(),/^(H[1-6]|P|ADDRESS|PRE)$/);
this.select.val(j?j.nodeName.toLowerCase():"span")}}})(jQuery);(function(a){elRTE.prototype.ui.prototype.buttons.fullscreen=function(g,f){var b=this;this.constructor.prototype.constructor.call(this,g,f);this.active=true;this.editor=g.editor;this.wz=g.workzone;this.height=0;this.delta=0;this._class="el-fullscreen";setTimeout(function(){b.height=b.wz.height();b.delta=b.editor.outerHeight()-b.height},50);function c(){b.wz.height(a(window).height()-b.delta);b.rte.updateHeight()}this.command=function(){var B=a(window),u=this.editor,k=u.parents().filter(function(h,p){return !/^(html|body)$/i.test(p.nodeName)&&a(p).css("position")=="relative"
}),q=this.wz,z=this._class,t=u.hasClass(z),j=this.rte,C=this.rte.selection,o=a.browser.mozilla,A,r;function x(){if(o){A=C.getBookmark()}}function v(){if(o){b.wz.children().toggle();b.rte.source.focus();b.wz.children().toggle();C.moveToBookmark(A)}}x();k.css("position",t?"relative":"static");if(t){u.removeClass(z);q.height(this.height);B.unbind("resize",c);this.domElem.removeClass("active")}else{u.addClass(z).removeAttr("style");q.height(B.height()-this.delta).css("width","100%");B.bind("resize",c);
this.domElem.addClass("active")}j.updateHeight();j.resizable(t);v()};this.update=function(){this.domElem.removeClass("disabled")}}})(jQuery);(function(a){elRTE.prototype.ui.prototype.buttons.horizontalrule=function(f,c){this.constructor.prototype.constructor.call(this,f,c);var b=this;this.src={width:a('<input type="text" />').attr({name:"width",size:4}).css("text-align","right"),wunit:a("<select />").attr("name","wunit").append(a("<option />").val("%").text("%")).append(a("<option />").val("px").text("px")).val("%"),height:a('<input type="text" />').attr({name:"height",size:4}).css("text-align","right"),bg:a("<div />"),border:a("<div />"),"class":a('<input type="text" />').css("width","100%"),style:a('<input type="text" />').css("width","100%")};
this.command=function(){this.src.bg.elColorPicker({palettePosition:"outer","class":"el-colorpicker ui-icon ui-icon-pencil"});var k=this.rte.selection.getEnd();this.hr=k.nodeName=="HR"?a(k):a(f.doc.createElement("hr")).css({width:"100%",height:"1px"});this.src.border.elBorderSelect({styleHeight:73,value:this.hr});var g=this.hr.css("width")||this.hr.attr("width");this.src.width.val(parseInt(g)||100);this.src.wunit.val(g.indexOf("px")!=-1?"px":"%");this.src.height.val(this.rte.utils.toPixels(this.hr.css("height")||this.hr.attr("height"))||1);
this.src.bg.val(this.rte.utils.color2Hex(this.hr.css("background-color")));this.src["class"].val(this.rte.dom.attr(this.hr,"class"));this.src.style.val(this.rte.dom.attr(this.hr,"style"));var h={rtl:this.rte.rtl,submit:function(o,p){o.stopPropagation();o.preventDefault();b.set();p.close()},dialog:{title:this.rte.i18n("Horizontal rule")}};var j=new elDialogForm(h);j.append([this.rte.i18n("Width"),a("<span />").append(this.src.width).append(this.src.wunit)],null,true).append([this.rte.i18n("Height"),a("<span />").append(this.src.height).append(" px")],null,true).append([this.rte.i18n("Border"),this.src.border],null,true).append([this.rte.i18n("Background"),this.src.bg],null,true).append([this.rte.i18n("Css class"),this.src["class"]],null,true).append([this.rte.i18n("Css style"),this.src.style],null,true).open()
};this.update=function(){this.domElem.removeClass("disabled");if(this.rte.selection.getEnd().nodeName=="HR"){this.domElem.addClass("active")}else{this.domElem.removeClass("active")}};this.set=function(){this.rte.history.add();!this.hr.parentNode&&this.rte.selection.insertNode(this.hr.get(0));var h={noshade:true,style:this.src.style.val()};var g=this.src.border.val();var j={width:(parseInt(this.src.width.val())||100)+this.src.wunit.val(),height:parseInt(this.src.height.val())||1,"background-color":this.src.bg.val(),border:g.width&&g.style?g.width+" "+g.style+" "+g.color:""};
this.hr.removeAttr("class").removeAttr("style").removeAttr("width").removeAttr("height").removeAttr("align").attr(h).css(j);if(this.src["class"].val()){this.hr.attr("class",this.src["class"].val())}this.rte.ui.update()}}})(jQuery);(function(a){elRTE.prototype.ui.prototype.buttons.image=function(b,c){this.constructor.prototype.constructor.call(this,b,c);var q=this,b=q.rte,h=0,f=0,p=0,g=null,j=function(t){a.each(q.src,function(u,v){a.each(v,function(x,w){if(x=="src"&&t){return}w.val("")})})},o=function(t){a.each(q.src,function(u,v){a.each(v,function(E,B){var C,x,D,A,z;
if(E=="width"){C=t.width()}else{if(E=="height"){C=t.height()}else{if(E=="border"){C="";z=t.css("border")||b.utils.parseStyle(t.attr("style")).border||"";if(z){x=z.match(/(\d(px|em|%))/);D=z.match(/(#[a-z0-9]+)/);C={width:x?x[1]:z,style:z,color:b.utils.color2Hex(D?D[1]:z)}}}else{if(E=="margin"){C=t}else{if(E=="align"){C=t.css("float");if(C!="left"&&C!="right"){C=t.css("vertical-align")}}else{C=t.attr(E)||""}}}}}if(u=="events"){C=b.utils.trimEventCallback(C)}B.val(C)})})},k=function(){var t=q.src.main.src.val();
j(true);if(!t){q.preview.children("img").remove();q.prevImg=null}else{if(q.prevImg){q.prevImg.removeAttr("src").removeAttr("style").removeAttr("class").removeAttr("id").removeAttr("title").removeAttr("alt").removeAttr("longdesc");a.each(q.src.events,function(v,u){q.prevImg.removeAttr(v)})}else{q.prevImg=a("<img/>").prependTo(q.preview)}q.prevImg.load(function(){q.prevImg.unbind("load");setTimeout(function(){f=q.prevImg.width();p=q.prevImg.height();h=(f/p).toFixed(2);q.src.main.width.val(f);q.src.main.height.val(p)
},100)}).attr("src",t)}},r=function(v){var t=parseInt(q.src.main.width.val())||0,u=parseInt(q.src.main.height.val())||0;if(q.prevImg){if(t&&u){if(v.target===q.src.main.width[0]){u=parseInt(t/h)}else{t=parseInt(u*h)}}else{t=f;u=p}q.src.main.height.val(u);q.src.main.width.val(t);q.prevImg.width(t).height(u);q.src.adv.style.val(q.prevImg.attr("style"))}};this.img=null;this.prevImg=null;this.preview=a('<div class="elrte-image-preview"/>').text("Proin elit arcu, rutrum commodo, vehicula tempus, commodo a, risus. Curabitur nec arcu. Donec sollicitudin mi sit amet mauris. Nam elementum quam ullamcorper ante. Etiam aliquet massa et lorem. Mauris dapibus lacus auctor risus. Aenean tempor ullamcorper leo. Vivamus sed magna quis ligula eleifend adipiscing. Duis orci. Aliquam sodales tortor vitae ipsum. Aliquam nulla. Duis aliquam molestie erat. Ut et mauris vel pede varius sollicitudin");
this.init=function(){this.labels={main:"Properies",link:"Link",adv:"Advanced",events:"Events",id:"ID","class":"Css class",style:"Css style",longdesc:"Detail description URL",href:"URL",target:"Open in",title:"Title"};this.src={main:{src:a('<input type="text" />').css("width","100%").change(k),title:a('<input type="text" />').css("width","100%"),alt:a('<input type="text" />').css("width","100%"),width:a('<input type="text" />').attr("size",5).css("text-align","right").change(r),height:a('<input type="text" />').attr("size",5).css("text-align","right").change(r),margin:a("<div />").elPaddingInput({type:"margin",change:function(){var t=q.src.main.margin.val();
if(q.prevImg){if(t.css){q.prevImg.css("margin",t.css)}else{q.prevImg.css({"margin-left":t.left,"margin-top":t.top,"margin-right":t.right,"margin-bottom":t.bottom})}}}}),align:a("<select />").css("width","100%").append(a("<option />").val("").text(this.rte.i18n("Not set","dialogs"))).append(a("<option />").val("left").text(this.rte.i18n("Left"))).append(a("<option />").val("right").text(this.rte.i18n("Right"))).append(a("<option />").val("top").text(this.rte.i18n("Top"))).append(a("<option />").val("text-top").text(this.rte.i18n("Text top"))).append(a("<option />").val("middle").text(this.rte.i18n("middle"))).append(a("<option />").val("baseline").text(this.rte.i18n("Baseline"))).append(a("<option />").val("bottom").text(this.rte.i18n("Bottom"))).append(a("<option />").val("text-bottom").text(this.rte.i18n("Text bottom"))).change(function(){var u=a(this).val(),t={"float":"","vertical-align":""};
if(q.prevImg){if(u=="left"||u=="right"){t["float"]=u;t["vertical-align"]=""}else{if(u){t["float"]="";t["vertical-align"]=u}}q.prevImg.css(t)}}),border:a("<div />").elBorderSelect({name:"border",change:function(){var t=q.src.main.border.val();if(q.prevImg){q.prevImg.css("border",t.width?t.width+" "+t.style+" "+t.color:"")}}})},adv:{},events:{}};a.each(["id","class","style","longdesc"],function(u,t){q.src.adv[t]=a('<input type="text" style="width:100%" />')});this.src.adv["class"].change(function(){if(q.prevImg){q.prevImg.attr("class",a(this).val())
}});this.src.adv.style.change(function(){if(q.prevImg){q.prevImg.attr("style",a(this).val());o(q.prevImg)}});a.each(["onblur","onfocus","onclick","ondblclick","onmousedown","onmouseup","onmouseover","onmouseout","onmouseleave","onkeydown","onkeypress","onkeyup"],function(){q.src.events[this]=a('<input type="text"  style="width:100%"/>')})};this.command=function(){!this.src&&this.init();var t,w={rtl:b.rtl,submit:function(z,A){z.stopPropagation();z.preventDefault();q.set();u.close()},close:function(){g&&b.selection.moveToBookmark(g)
},dialog:{autoOpen:false,width:500,position:"top",title:b.i18n("Image"),resizable:true,open:function(){a.fn.resizable&&a(this).parents(".ui-dialog:first").resizable("option","alsoResize",".elrte-image-preview")}}},u=new elDialogForm(w),v=!!b.options.fmOpen,x=v?a('<div class="elrte-image-src-fm"><span class="ui-state-default ui-corner-all"><span class="ui-icon ui-icon-folder-open"/></span></div>').append(this.src.main.src.css("width","87%")):this.src.main.src;j();this.preview.children("img").remove();
this.prevImg=null;t=b.selection.getEnd();this.img=t.nodeName=="IMG"&&!a(t).is(".elrte-protected")?a(t):a("<img/>");g=b.selection.getBookmark();if(v){x.children(".ui-state-default").click(function(){b.options.fmOpen(function(z){q.src.main.src.val(z).change()})}).hover(function(){a(this).toggleClass("ui-state-hover")})}u.tab("main",this.rte.i18n("Properies")).append([this.rte.i18n("Image URL"),x],"main",true).append([this.rte.i18n("Title"),this.src.main.title],"main",true).append([this.rte.i18n("Alt text"),this.src.main.alt],"main",true).append([this.rte.i18n("Size"),a("<span />").append(this.src.main.width).append(" x ").append(this.src.main.height).append(" px")],"main",true).append([this.rte.i18n("Alignment"),this.src.main.align],"main",true).append([this.rte.i18n("Margins"),this.src.main.margin],"main",true).append([this.rte.i18n("Border"),this.src.main.border],"main",true);
u.append(a("<fieldset><legend>"+this.rte.i18n("Preview")+"</legend></fieldset>").append(this.preview),"main");a.each(this.src,function(A,z){if(A=="main"){return}u.tab(A,b.i18n(q.labels[A]));a.each(z,function(B,C){q.src[A][B].val(A=="events"?b.utils.trimEventCallback(q.img.attr(B)):q.img.attr(B)||"");u.append([b.i18n(q.labels[B]||B),q.src[A][B]],A,true)})});u.open();if(this.img.attr("src")){o(this.img);this.prevImg=this.img.clone().prependTo(this.preview);h=(this.img.width()/this.img.height()).toFixed(2);
f=parseInt(this.img.width());p=parseInt(this.img.height())}};this.set=function(){var u=this.src.main.src.val(),t;this.rte.history.add();g&&b.selection.moveToBookmark(g);if(!u){t=b.dom.selfOrParentLink(this.img[0]);t&&t.remove();return this.img.remove()}!this.img[0].parentNode&&(this.img=a(this.rte.doc.createElement("img")));this.img.attr("src",u).attr("style",this.src.adv.style.val());a.each(this.src,function(v,w){a.each(w,function(x,A){var B=A.val(),z;switch(x){case"width":q.img.css("width",B);break;
case"height":q.img.css("height",B);break;case"align":q.img.css(B=="left"||B=="right"?"float":"vertical-align",B);break;case"margin":if(B.css){q.img.css("margin",B.css)}else{q.img.css({"margin-left":B.left,"margin-top":B.top,"margin-right":B.right,"margin-bottom":B.bottom})}break;case"border":if(!B.width){B=""}else{B="border:"+B.css+";"+a.trim((q.img.attr("style")||"").replace(/border\-[^;]+;?/ig,""));x="style";q.img.attr("style",B);return}break;case"src":case"style":return;default:B?q.img.attr(x,B):q.img.removeAttr(x)
}})});!this.img[0].parentNode&&b.selection.insertNode(this.img[0]);this.rte.ui.update()};this.update=function(){this.domElem.removeClass("disabled");var u=this.rte.selection.getEnd(),t=a(u);if(u.nodeName=="IMG"&&!t.hasClass("elrte-protected")){this.domElem.addClass("active")}else{this.domElem.removeClass("active")}}}})(jQuery);(function(a){elRTE.prototype.ui.prototype.buttons.indent=function(f,c){this.constructor.prototype.constructor.call(this,f,c);var b=this;this.command=function(){this.rte.history.add();
var h=this.rte.selection.selected({collapsed:true,blocks:true,wrap:"inline",tag:"p"});function g(q){var o=/(IMG|HR|TABLE|EMBED|OBJECT)/.test(q.nodeName)?"margin-left":"padding-left";var p=b.rte.dom.attr(q,"style").indexOf(o)!=-1?parseInt(a(q).css(o))||0:0;a(q).css(o,p+40+"px")}for(var j=0;j<h.length;j++){if(/^(TABLE|THEAD|TFOOT|TBODY|COL|COLGROUP|TR)$/.test(h[j].nodeName)){a(h[j]).find("td,th").each(function(){g(this)})}else{if(/^LI$/.test(h[j].nodeName)){var k=a(h[j]);a(this.rte.dom.create(h[j].parentNode.nodeName)).append(a(this.rte.dom.create("li")).html(k.html()||"")).appendTo(k.html("&nbsp;"))
}else{g(h[j])}}}this.rte.ui.update()};this.update=function(){this.domElem.removeClass("disabled")}}})(jQuery);(function(a){elRTE.prototype.ui.prototype.buttons.justifyleft=function(c,b){this.constructor.prototype.constructor.call(this,c,b);this.align=this.name=="justifyfull"?"justify":this.name.replace("justify","");this.command=function(){var g=this.rte.selection.selected({collapsed:true,blocks:true,tag:"div"}),f=g.length;f&&this.rte.history.add();while(f--){this.rte.dom.filter(g[f],"textNodes")&&a(g[f]).css("text-align",this.align)
}this.rte.ui.update()};this.update=function(){var f=this.rte.selection.getNode(),g=f.nodeName=="BODY"?f:this.rte.dom.selfOrParent(f,"textNodes")||(f.parentNode&&f.parentNode.nodeName=="BODY"?f.parentNode:null);if(g){this.domElem.removeClass("disabled").toggleClass("active",a(g).css("text-align")==this.align)}else{this.domElem.addClass("disabled")}}};elRTE.prototype.ui.prototype.buttons.justifycenter=elRTE.prototype.ui.prototype.buttons.justifyleft;elRTE.prototype.ui.prototype.buttons.justifyright=elRTE.prototype.ui.prototype.buttons.justifyleft;
elRTE.prototype.ui.prototype.buttons.justifyfull=elRTE.prototype.ui.prototype.buttons.justifyleft})(jQuery);(function(a){elRTE.prototype.ui.prototype.buttons.link=function(f,c){this.constructor.prototype.constructor.call(this,f,c);var b=this;this.img=false;this.bm;function g(){b.labels={id:"ID","class":"Css class",style:"Css style",dir:"Script direction",lang:"Language",charset:"Charset",type:"Target MIME type",rel:"Relationship page to target (rel)",rev:"Relationship target to page (rev)",tabindex:"Tab index",accesskey:"Access key"};
b.src={main:{href:a('<input type="text" />'),title:a('<input type="text" />'),anchor:a("<select />").attr("name","anchor"),target:a("<select />").append(a("<option />").text(b.rte.i18n("In this window")).val("")).append(a("<option />").text(b.rte.i18n("In new window (_blank)")).val("_blank"))},popup:{use:a('<input type="checkbox" />'),url:a('<input type="text" />').val("http://"),name:a('<input type="text" />'),width:a('<input type="text" />').attr({size:6,title:b.rte.i18n("Width")}).css("text-align","right"),height:a('<input type="text" />').attr({size:6,title:b.rte.i18n("Height")}).css("text-align","right"),left:a('<input type="text" />').attr({size:6,title:b.rte.i18n("Left")}).css("text-align","right"),top:a('<input type="text" />').attr({size:6,title:b.rte.i18n("Top")}).css("text-align","right"),location:a('<input type="checkbox" />'),menubar:a('<input type="checkbox" />'),toolbar:a('<input type="checkbox" />'),scrollbars:a('<input type="checkbox" />'),status:a('<input type="checkbox" />'),resizable:a('<input type="checkbox" />'),dependent:a('<input type="checkbox" />'),retfalse:a('<input type="checkbox" />').attr("checked",true)},adv:{id:a('<input type="text" />'),"class":a('<input type="text" />'),style:a('<input type="text" />'),dir:a("<select />").append(a("<option />").text(b.rte.i18n("Not set")).val("")).append(a("<option />").text(b.rte.i18n("Left to right")).val("ltr")).append(a("<option />").text(b.rte.i18n("Right to left")).val("rtl")),lang:a('<input type="text" />'),charset:a('<input type="text" />'),type:a('<input type="text" />'),rel:a('<input type="text" />'),rev:a('<input type="text" />'),tabindex:a('<input type="text" />'),accesskey:a('<input type="text" />')},events:{}};
a.each(["onblur","onfocus","onclick","ondblclick","onmousedown","onmouseup","onmouseover","onmouseout","onmouseleave","onkeydown","onkeypress","onkeyup"],function(){b.src.events[this]=a('<input type="text" />')});a.each(b.src,function(){for(var j in this){var h=this[j].attr("type");if(!h||(h=="text"&&!this[j].attr("size"))){this[j].css("width","100%")}}})}this.command=function(){var p=this.rte.selection.getNode(),o,u,x,h,t,j,w,k,z;!this.src&&g();this.bm=this.rte.selection.getBookmark();function q(r){return r.nodeName=="A"&&r.href
}this.link=this.rte.dom.selfOrParentLink(p);if(!this.link){o=a.browser.msie?this.rte.selection.selected():this.rte.selection.selected({wrap:false});if(o.length){for(u=0;u<o.length;u++){if(q(o[u])){this.link=o[u];break}}if(!this.link){this.link=this.rte.dom.parent(o[0],q)||this.rte.dom.parent(o[o.length-1],q)}}}this.link=this.link?a(this.link):a(this.rte.doc.createElement("a"));this.img=p.nodeName=="IMG"?p:null;this.updatePopup();this.src.main.anchor.empty();a('a[href!=""][name]',this.rte.doc).each(function(){var r=a(this).attr("name");
b.src.main.anchor.append(a("<option />").val(r).text(r))});if(this.src.main.anchor.children().length){this.src.main.anchor.prepend(a("<option />").val("").text(this.rte.i18n("Select bookmark"))).change(function(){var r=a(this).val();if(r){b.src.main.href.val("#"+r)}})}h={rtl:this.rte.rtl,submit:function(r,v){r.stopPropagation();r.preventDefault();b.set();v.close()},tabs:{show:function(v,r){if(r.index==3){b.updateOnclick()}}},close:function(){b.rte.browser.msie&&b.rte.selection.restoreIERange()},dialog:{width:"auto",width:430,title:this.rte.i18n("Link")}};
d=new elDialogForm(h);t=a("<div />").append(a("<label />").append(this.src.popup.location).append(this.rte.i18n("Location bar"))).append(a("<label />").append(this.src.popup.menubar).append(this.rte.i18n("Menu bar"))).append(a("<label />").append(this.src.popup.toolbar).append(this.rte.i18n("Toolbar"))).append(a("<label />").append(this.src.popup.scrollbars).append(this.rte.i18n("Scrollbars")));j=a("<div />").append(a("<label />").append(this.src.popup.status).append(this.rte.i18n("Status bar"))).append(a("<label />").append(this.src.popup.resizable).append(this.rte.i18n("Resizable"))).append(a("<label />").append(this.src.popup.dependent).append(this.rte.i18n("Depedent"))).append(a("<label />").append(this.src.popup.retfalse).append(this.rte.i18n("Add return false")));
d.tab("main",this.rte.i18n("Properies")).tab("popup",this.rte.i18n("Popup")).tab("adv",this.rte.i18n("Advanced")).tab("events",this.rte.i18n("Events")).append(a("<label />").append(this.src.popup.use).append(this.rte.i18n("Open link in popup window")),"popup").separator("popup").append([this.rte.i18n("URL"),this.src.popup.url],"popup",true).append([this.rte.i18n("Window name"),this.src.popup.name],"popup",true).append([this.rte.i18n("Window size"),a("<span />").append(this.src.popup.width).append(" x ").append(this.src.popup.height).append(" px")],"popup",true).append([this.rte.i18n("Window position"),a("<span />").append(this.src.popup.left).append(" x ").append(this.src.popup.top).append(" px")],"popup",true).separator("popup").append([t,j],"popup",true);
w=this.link.get(0);k=this.rte.dom.attr(w,"href");this.src.main.href.val(k).change(function(){a(this).val(b.rte.utils.absoluteURL(a(this).val()))});if(this.rte.options.fmAllow&&this.rte.options.fmOpen){var z=a("<span />").append(this.src.main.href.css("width","87%")).append(a("<span />").addClass("ui-state-default ui-corner-all").css({"float":"right","margin-right":"3px"}).attr("title",b.rte.i18n("Open file manger")).append(a("<span />").addClass("ui-icon ui-icon-folder-open")).click(function(){b.rte.options.fmOpen(function(r){b.src.main.href.val(r).change()
})}).hover(function(){a(this).addClass("ui-state-hover")},function(){a(this).removeClass("ui-state-hover")}));d.append([this.rte.i18n("Link URL"),z],"main",true)}else{d.append([this.rte.i18n("Link URL"),this.src.main.href],"main",true)}this.src.main.href.change();d.append([this.rte.i18n("Title"),this.src.main.title.val(this.rte.dom.attr(w,"title"))],"main",true);if(this.src.main.anchor.children().length){d.append([this.rte.i18n("Bookmark"),this.src.main.anchor.val(k)],"main",true)}if(!(this.rte.options.doctype.match(/xhtml/)&&this.rte.options.doctype.match(/strict/))){d.append([this.rte.i18n("Target"),this.src.main.target.val(this.link.attr("target")||"")],"main",true)
}for(var p in this.src.adv){this.src.adv[p].val(this.rte.dom.attr(w,p));d.append([this.rte.i18n(this.labels[p]?this.labels[p]:p),this.src.adv[p]],"adv",true)}for(var p in this.src.events){var x=this.rte.utils.trimEventCallback(this.rte.dom.attr(w,p));this.src.events[p].val(x);d.append([this.rte.i18n(this.labels[p]?this.labels[p]:p),this.src.events[p]],"events",true)}this.src.popup.use.change(function(){var r=a(this).attr("checked");a.each(b.src.popup,function(){if(a(this).attr("name")!="use"){if(r){a(this).removeAttr("disabled")
}else{a(this).attr("disabled",true)}}})});this.src.popup.use.change();d.open()};this.update=function(){var h=this.rte.selection.getNode();if(this.rte.dom.selfOrParentLink(h)){this.domElem.removeClass("disabled").addClass("active")}else{if(this.rte.dom.selectionHas(function(j){return j.nodeName=="A"&&j.href})){this.domElem.removeClass("disabled").addClass("active")}else{if(!this.rte.selection.collapsed()||h.nodeName=="IMG"){this.domElem.removeClass("disabled active")}else{this.domElem.addClass("disabled").removeClass("active")
}}}};this.updatePopup=function(){var h=""+this.link.attr("onclick");if(h.length>0&&(m=h.match(/window.open\('([^']+)',\s*'([^']*)',\s*'([^']*)'\s*.*\);\s*(return\s+false)?/))){this.src.popup.use.attr("checked","on");this.src.popup.url.val(m[1]);this.src.popup.name.val(m[2]);if(/location=yes/.test(m[3])){this.src.popup.location.attr("checked",true)}if(/menubar=yes/.test(m[3])){this.src.popup.menubar.attr("checked",true)}if(/toolbar=yes/.test(m[3])){this.src.popup.toolbar.attr("checked",true)}if(/scrollbars=yes/.test(m[3])){this.src.popup.scrollbars.attr("checked",true)
}if(/status=yes/.test(m[3])){this.src.popup.status.attr("checked",true)}if(/resizable=yes/.test(m[3])){this.src.popup.resizable.attr("checked",true)}if(/dependent=yes/.test(m[3])){this.src.popup.dependent.attr("checked",true)}if((_m=m[3].match(/width=([^,]+)/))){this.src.popup.width.val(_m[1])}if((_m=m[3].match(/height=([^,]+)/))){this.src.popup.height.val(_m[1])}if((_m=m[3].match(/left=([^,]+)/))){this.src.popup.left.val(_m[1])}if((_m=m[3].match(/top=([^,]+)/))){this.src.popup.top.val(_m[1])}if(m[4]){this.src.popup.retfalse.attr("checked",true)
}}else{a.each(this.src.popup,function(){var j=a(this);if(j.attr("type")=="text"){j.val(j.attr("name")=="url"?"http://":"")}else{if(j.attr("name")=="retfalse"){this.attr("checked",true)}else{j.removeAttr("checked")}}})}};this.updateOnclick=function(){var o=this.src.popup.url.val();if(this.src.popup.use.attr("checked")&&o){var p="";if(this.src.popup.location.attr("checked")){p+="location=yes,"}if(this.src.popup.menubar.attr("checked")){p+="menubar=yes,"}if(this.src.popup.toolbar.attr("checked")){p+="toolbar=yes,"
}if(this.src.popup.scrollbars.attr("checked")){p+="scrollbars=yes,"}if(this.src.popup.status.attr("checked")){p+="status=yes,"}if(this.src.popup.resizable.attr("checked")){p+="resizable=yes,"}if(this.src.popup.dependent.attr("checked")){p+="dependent=yes,"}if(this.src.popup.width.val()){p+="width="+this.src.popup.width.val()+","}if(this.src.popup.height.val()){p+="height="+this.src.popup.height.val()+","}if(this.src.popup.left.val()){p+="left="+this.src.popup.left.val()+","}if(this.src.popup.top.val()){p+="top="+this.src.popup.top.val()+","
}if(p.length>0){p=p.substring(0,p.length-1)}var j=this.src.popup.retfalse.attr("checked")?"return false;":"";var k="window.open('"+o+"', '"+a.trim(this.src.popup.name.val())+"', '"+p+"'); "+j;this.src.events.onclick.val(k);if(!this.src.main.href.val()){this.src.main.href.val("#")}}else{var h=this.src.events.onclick.val();h=h.replace(/window\.open\([^\)]+\)\s*;?\s*return\s*false\s*;?/i,"");this.src.events.onclick.val(h)}};this.set=function(){var j,k;this.updateOnclick();this.rte.selection.moveToBookmark(this.bm);
this.rte.history.add();j=this.rte.utils.absoluteURL(this.src.main.href.val());if(!j){var p=this.rte.selection.getBookmark();this.rte.dom.unwrap(this.link[0]);this.rte.selection.moveToBookmark(p)}else{if(this.img&&this.img.parentNode){this.link=a(this.rte.dom.create("a")).attr("href",j);this.rte.dom.wrap(this.img,this.link[0])}else{if(!this.link[0].parentNode){k="#--el-editor---"+Math.random();this.rte.doc.execCommand("createLink",false,k);this.link=a('a[href="'+k+'"]',this.rte.doc);this.link.each(function(){var r=a(this);
if(!a.trim(r.html())&&!a.trim(r.text())){r.replaceWith(r.text())}})}}this.src.main.href.val(j);for(var o in this.src){if(o!="popup"){for(var q in this.src[o]){if(q!="anchors"){var h=a.trim(this.src[o][q].val());if(h){this.link.attr(q,h)}else{this.link.removeAttr(q)}}}}}this.img&&this.rte.selection.select(this.img)}this.rte.ui.update(true)}}})(jQuery);(function(a){elRTE.prototype.ui.prototype.buttons.nbsp=function(c,b){this.constructor.prototype.constructor.call(this,c,b);this.command=function(){this.rte.history.add();
this.rte.selection.insertHtml("&nbsp;",true);this.rte.window.focus();this.rte.ui.update()};this.update=function(){this.domElem.removeClass("disabled")}}})(jQuery);(function(a){elRTE.prototype.ui.prototype.buttons.outdent=function(f,c){this.constructor.prototype.constructor.call(this,f,c);var b=this;this.command=function(){var g=this.find();if(g.node){this.rte.history.add();a(g.node).css(g.type,(g.val>40?g.val-40:0)+"px");this.rte.ui.update()}};this.find=function(j){function g(p){var k={type:"",val:0};
var o;if((o=b.rte.dom.attr(p,"style"))){k.type=o.indexOf("padding-left")!=-1?"padding-left":(o.indexOf("margin-left")!=-1?"margin-left":"");k.val=k.type?parseInt(a(p).css(k.type))||0:0}return k}var j=this.rte.selection.getNode();var h=g(j);if(h.val){h.node=j}else{a.each(this.rte.dom.parents(j,"*"),function(){h=g(this);if(h.val){h.node=this;return h}})}return h};this.update=function(){var g=this.find();if(g.node){this.domElem.removeClass("disabled")}else{this.domElem.addClass("disabled")}}}})(jQuery);
(function(a){elRTE.prototype.ui.prototype.buttons.pagebreak=function(c,b){this.constructor.prototype.constructor.call(this,c,b);a(this.rte.doc.body).bind("mousedown",function(f){if(a(f.target).hasClass("elrte-pagebreak")){f.preventDefault()}});this.command=function(){this.rte.selection.insertHtml('<img src="'+this.rte.filter.url+'pixel.gif" class="elrte-protected elrte-pagebreak"/>',false)};this.update=function(){this.domElem.removeClass("disabled")}}})(jQuery);(function(a){elRTE.prototype.ui.prototype.buttons.pasteformattext=function(f,c){this.constructor.prototype.constructor.call(this,f,c);
this.iframe=a(document.createElement("iframe")).addClass("el-rte-paste-input");this.doc=null;var b=this;this.command=function(){this.rte.selection.saveIERange();var g=this,h={submit:function(o,p){o.stopPropagation();o.preventDefault();g.paste();p.close()},dialog:{width:500,title:this.rte.i18n("Paste formatted text")}},k=new elDialogForm(h);k.append(this.iframe).open();this.doc=this.iframe.get(0).contentWindow.document;html=this.rte.options.doctype+'<html xmlns="http://www.w3.org/1999/xhtml"><head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />';
html+="</head><body> <br /> </body></html>";this.doc.open();this.doc.write(html);this.doc.close();if(!this.rte.browser.msie){try{this.doc.designMode="on"}catch(j){}}else{this.doc.body.contentEditable=true}setTimeout(function(){g.iframe[0].contentWindow.focus()},50)};this.paste=function(){a(this.doc.body).find("[class]").removeAttr("class");var g=a.trim(a(this.doc.body).html());if(g){this.rte.history.add();this.rte.selection.restoreIERange();this.rte.selection.insertHtml(this.rte.filter.wysiwyg2wysiwyg(this.rte.filter.proccess("paste",g)));
this.rte.ui.update(true)}};this.update=function(){this.domElem.removeClass("disabled")}}})(jQuery);(function(a){elRTE.prototype.ui.prototype.buttons.pastetext=function(f,c){this.constructor.prototype.constructor.call(this,f,c);this.input=a("<textarea />").addClass("el-rte-paste-input");var b=this;this.command=function(){this.rte.browser.msie&&this.rte.selection.saveIERange();var g={submit:function(j,k){j.stopPropagation();j.preventDefault();b.paste();k.close()},dialog:{width:500,title:this.rte.i18n("Paste only text")}};
var h=new elDialogForm(g);h.append(this.input).open()};this.paste=function(){var g=a.trim(this.input.val());if(g){this.rte.history.add();this.rte.browser.msie&&this.rte.selection.restoreIERange();this.rte.selection.insertText(g.replace(/\r?\n/g,"<br />"),true);this.rte.ui.update(true)}this.input.val("")};this.update=function(){this.domElem.removeClass("disabled")}}})(jQuery);(function(a){elRTE.prototype.ui.prototype.buttons.save=function(c,b){this.constructor.prototype.constructor.call(this,c,b);
this.active=true;this.command=function(){this.rte.save()};this.update=function(){}}})(jQuery);(function(a){elRTE.prototype.ui.prototype.buttons.smiley=function(f,c){this.constructor.prototype.constructor.call(this,f,c);var b=this;this.img=null;this.url=this.rte.filter.url+"smileys/";this.smileys={smile:"smile.png",happy:"happy.png",tongue:"tongue.png",surprised:"surprised.png",waii:"waii.png",wink:"wink.png",evilgrin:"evilgrin.png",grin:"grin.png",unhappy:"unhappy.png"};this.width=120;this.command=function(){var h=this,j=this.url,o,k,g;
this.rte.browser.msie&&this.rte.selection.saveIERange();k={dialog:{height:120,width:this.width,title:this.rte.i18n("Smiley"),buttons:{}}};o=new elDialogForm(k);a.each(this.smileys,function(q,p){o.append(a('<img src="'+j+p+'" title="'+q+'" id="'+q+'" class="el-rte-smiley"/>').click(function(){h.set(this.id,o)}))});o.open()};this.update=function(){this.domElem.removeClass("disabled");this.domElem.removeClass("active")};this.set=function(g,h){this.rte.browser.msie&&this.rte.selection.restoreIERange();
if(this.smileys[g]){this.img=a(this.rte.doc.createElement("img"));this.img.attr({src:this.url+this.smileys[g],title:g,alt:g});this.rte.selection.insertNode(this.img.get(0));this.rte.ui.update()}h.close()}}})(jQuery);(function(a){elRTE.prototype.ui.prototype.buttons.stopfloat=function(c,b){this.constructor.prototype.constructor.call(this,c,b);this.find=function(){if(this.rte.selection.collapsed()){var f=this.rte.dom.selfOrParent(this.rte.selection.getEnd(),/^DIV$/);if(f&&(this.rte.dom.attr(f,"clear")||a(f).css("clear")!="none")){return f
}}};this.command=function(){var f;if((f=this.find())){var f=a(f);this.rte.history.add();if(!f.children().length&&!a.trim(f.text()).length){f.remove()}else{f.removeAttr("clear").css("clear","")}}else{this.rte.history.add();this.rte.selection.insertNode(a(this.rte.dom.create("div")).css("clear","both").get(0),true)}this.rte.ui.update(true)};this.update=function(){this.domElem.removeClass("disabled");if(this.find()){this.domElem.addClass("active")}else{this.domElem.removeClass("active")}}}})(jQuery);
(function(a){elRTE.prototype.ui.prototype.buttons.table=function(f,c){this.constructor.prototype.constructor.call(this,f,c);var b=this;this.src=null;this.labels=null;function g(){b.labels={main:"Properies",adv:"Advanced",events:"Events",id:"ID","class":"Css class",style:"Css style",dir:"Script direction",summary:"Summary",lang:"Language",href:"URL"};b.src={main:{caption:a('<input type="text" />'),rows:a('<input type="text" />').attr("size",5).val(2),cols:a('<input type="text" />').attr("size",5).val(2),width:a('<input type="text" />').attr("size",5),wunit:a("<select />").append(a("<option />").val("%").text("%")).append(a("<option />").val("px").text("px")),height:a('<input type="text" />').attr("size",5),hunit:a("<select />").append(a("<option />").val("%").text("%")).append(a("<option />").val("px").text("px")),align:a("<select />").append(a("<option />").val("").text(b.rte.i18n("Not set"))).append(a("<option />").val("left").text(b.rte.i18n("Left"))).append(a("<option />").val("center").text(b.rte.i18n("Center"))).append(a("<option />").val("right").text(b.rte.i18n("Right"))),spacing:a('<input type="text" />').attr("size",5),padding:a('<input type="text" />').attr("size",5),border:a("<div />"),rules:a("<select />").append(a("<option />").val("none").text(b.rte.i18n("No"))).append(a("<option />").val("all").text(b.rte.i18n("Cells"))).append(a("<option />").val("groups").text(b.rte.i18n("Groups"))).append(a("<option />").val("rows").text(b.rte.i18n("Rows"))).append(a("<option />").val("cols").text(b.rte.i18n("Columns"))),margin:a("<div />"),bg:a("<div />"),bgimg:a('<input type="text" />').css("width","90%")},adv:{id:a('<input type="text" />'),summary:a('<input type="text" />'),"class":a('<input type="text" />'),style:a('<input type="text" />'),dir:a("<select />").append(a("<option />").text(b.rte.i18n("Not set")).val("")).append(a("<option />").text(b.rte.i18n("Left to right")).val("ltr")).append(a("<option />").text(b.rte.i18n("Right to left")).val("rtl")),lang:a('<input type="text" />')},events:{}};
a.each(b.src,function(){for(var j in this){this[j].attr("name",j);var h=this[j].get(0).nodeName;if(h=="INPUT"&&j!="bgimg"){this[j].css(this[j].attr("size")?{"text-align":"right"}:{width:"100%"})}else{if(h=="SELECT"&&j!="wunit"&&j!="hunit"){this[j].css("width","100%")}}}});a.each(["onblur","onfocus","onclick","ondblclick","onmousedown","onmouseup","onmouseover","onmouseout","onmouseleave","onkeydown","onkeypress","onkeyup"],function(){b.src.events[this]=a('<input type="text" />').css("width","100%")
});b.src.main.align.change(function(){var j=a(this).val();if(j=="center"){b.src.main.margin.val({left:"auto",right:"auto"})}else{var h=b.src.main.margin.val();if(h.left=="auto"&&h.right=="auto"){b.src.main.margin.val({left:"",right:""})}}});b.src.main.bgimg.change(function(){var h=a(this);h.val(b.rte.utils.absoluteURL(h.val()))})}this.command=function(){var r=this.rte.dom.selfOrParent(this.rte.selection.getNode(),/^TABLE$/);if(this.name=="table"){this.table=a(this.rte.doc.createElement("table"))}else{this.table=r?a(r):a(this.rte.doc.createElement("table"))
}!this.src&&g();this.src.main.border.elBorderSelect({styleHeight:117});this.src.main.bg.elColorPicker({palettePosition:"outer","class":"el-colorpicker ui-icon ui-icon-pencil"});this.src.main.margin.elPaddingInput({type:"margin",value:this.table});if(this.table.parents().length){this.src.main.rows.val("").attr("disabled",true);this.src.main.cols.val("").attr("disabled",true)}else{this.src.main.rows.val(2).removeAttr("disabled");this.src.main.cols.val(2).removeAttr("disabled")}var D=this.table.css("width")||this.table.attr("width");
this.src.main.width.val(parseInt(D)||"");this.src.main.wunit.val(D.indexOf("px")!=-1?"px":"%");var z=this.table.css("height")||this.table.attr("height");this.src.main.height.val(parseInt(z)||"");this.src.main.hunit.val(z&&z.indexOf("px")!=-1?"px":"%");var B=this.table.css("float");this.src.main.align.val("");if(B=="left"||B=="right"){this.src.main.align.val(B)}else{var t=this.table.css("margin-left");var p=this.table.css("margin-right");if(t=="auto"&&p=="auto"){this.src.main.align.val("center")}}this.src.main.border.val(this.table);
this.src.main.rules.val(this.rte.dom.attr(this.table.get(0),"rules"));this.src.main.bg.val(this.table.css("background-color"));var j=(this.table.css("background-image")||"").replace(/url\(([^\)]+)\)/i,"$1");this.src.main.bgimg.val(j!="none"?j:"");var k={rtl:this.rte.rtl,submit:function(h,v){h.stopPropagation();h.preventDefault();b.set();v.close()},dialog:{width:530,title:this.rte.i18n("Table")}};var C=new elDialogForm(k);for(var q in this.src){C.tab(q,this.rte.i18n(this.labels[q]));if(q=="main"){var A=a("<table />").append(a("<tr />").append("<td>"+this.rte.i18n("Rows")+"</td>").append(a("<td />").append(this.src.main.rows))).append(a("<tr />").append("<td>"+this.rte.i18n("Columns")+"</td>").append(a("<td />").append(this.src.main.cols)));
var x=a("<table />").append(a("<tr />").append("<td>"+this.rte.i18n("Width")+"</td>").append(a("<td />").append(this.src.main.width).append(this.src.main.wunit))).append(a("<tr />").append("<td>"+this.rte.i18n("Height")+"</td>").append(a("<td />").append(this.src.main.height).append(this.src.main.hunit)));var u=a("<table />").append(a("<tr />").append("<td>"+this.rte.i18n("Spacing")+"</td>").append(a("<td />").append(this.src.main.spacing.val(this.table.attr("cellspacing")||"")))).append(a("<tr />").append("<td>"+this.rte.i18n("Padding")+"</td>").append(a("<td />").append(this.src.main.padding.val(this.table.attr("cellpadding")||""))));
C.append([this.rte.i18n("Caption"),this.src.main.caption.val(this.table.find("caption").eq(0).text()||"")],"main",true).separator("main").append([A,x,u],"main",true).separator("main").append([this.rte.i18n("Border"),this.src.main.border],"main",true).append([this.rte.i18n("Inner borders"),this.src.main.rules],"main",true).append([this.rte.i18n("Alignment"),this.src.main.align],"main",true).append([this.rte.i18n("Margins"),this.src.main.margin],"main",true).append([this.rte.i18n("Background"),a("<span />").append(a("<span />").css({"float":"left","margin-right":"3px"}).append(this.src.main.bg)).append(this.src.main.bgimg)],"main",true)
}else{for(var o in this.src[q]){var E=this.rte.dom.attr(this.table,o);if(q=="events"){E=this.rte.utils.trimEventCallback(E)}C.append([this.rte.i18n(this.labels[o]?this.labels[o]:o),this.src[q][o].val(E)],q,true)}}}C.open()};this.set=function(){if(!this.table.parents().length){var k=parseInt(this.src.main.rows.val())||0;var B=parseInt(this.src.main.cols.val())||0;if(k<=0||B<=0){return}this.rte.history.add();var D=a(this.rte.doc.createElement("tbody")).appendTo(this.table);for(var u=0;u<k;u++){var C="<tr>";
for(var t=0;t<B;t++){C+="<td>&nbsp;</td>"}D.append(C+"</tr>")}}else{this.table.removeAttr("width").removeAttr("height").removeAttr("border").removeAttr("align").removeAttr("bordercolor").removeAttr("bgcolor").removeAttr("cellspacing").removeAttr("cellpadding").removeAttr("frame").removeAttr("rules").removeAttr("style")}var I=a.trim(this.src.main.caption.val());if(I){if(!this.table.children("caption").length){this.table.prepend("<caption />")}this.table.children("caption").text(I)}else{this.table.children("caption").remove()
}for(var p in this.src){if(p!="main"){for(var o in this.src[p]){var G=a.trim(this.src[p][o].val());if(G){this.table.attr(o,G)}else{this.table.removeAttr(o)}}}}var A,E,H;if((A=parseInt(this.src.main.spacing.val()))&&A>=0){this.table.attr("cellspacing",A)}if((E=parseInt(this.src.main.padding.val()))&&E>=0){this.table.attr("cellpadding",E)}if((H=this.src.main.rules.val())){this.table.attr("rules",H)}var F=parseInt(this.src.main.width.val())||"",x=parseInt(this.src.main.height.val())||"",u=a.trim(this.src.main.bgimg.val()),D=this.src.main.border.val(),q=this.src.main.margin.val(),z=this.src.main.align.val();
this.table.css({width:F?F+this.src.main.wunit.val():"",height:x?x+this.src.main.hunit.val():"",border:a.trim(D.width+" "+D.style+" "+D.color),"background-color":this.src.main.bg.val(),"background-image":u?"url("+u+")":""});if(q.css){this.table.css("margin",q.css)}else{this.table.css({"margin-top":q.top,"margin-right":q.right,"margin-bottom":q.bottom,"margin-left":q.left})}if((z=="left"||z=="right")&&this.table.css("margin-left")!="auto"&&this.table.css("margin-right")!="auto"){this.table.css("float",z)
}if(!this.table.attr("style")){this.table.removeAttr("style")}if(!this.table.parents().length){this.rte.selection.insertNode(this.table.get(0),true)}this.rte.ui.update()};this.update=function(){this.domElem.removeClass("disabled");if(this.name=="tableprops"&&!this.rte.dom.selfOrParent(this.rte.selection.getNode(),/^TABLE$/)){this.domElem.addClass("disabled").removeClass("active")}}};elRTE.prototype.ui.prototype.buttons.tableprops=elRTE.prototype.ui.prototype.buttons.table})(jQuery);(function(a){elRTE.prototype.ui.prototype.buttons.tablerm=function(c,b){this.constructor.prototype.constructor.call(this,c,b);
this.command=function(){var f=this.rte.dom.parent(this.rte.selection.getNode(),/^TABLE$/);if(f){this.rte.history.add();a(f).remove()}this.rte.ui.update(true)};this.update=function(){if(this.rte.dom.parent(this.rte.selection.getNode(),/^TABLE$/)){this.domElem.removeClass("disabled")}else{this.domElem.addClass("disabled")}}}})(jQuery);(function(a){elRTE.prototype.ui.prototype.buttons.tbcellprops=function(f,c){this.constructor.prototype.constructor.call(this,f,c);var b=this;this.src=null;this.labels=null;
function g(){b.labels={main:"Properies",adv:"Advanced",events:"Events",id:"ID","class":"Css class",style:"Css style",dir:"Script direction",lang:"Language"};b.src={main:{type:a("<select />").css("width","100%").append(a("<option />").val("td").text(b.rte.i18n("Data"))).append(a("<option />").val("th").text(b.rte.i18n("Header"))),width:a('<input type="text" />').attr("size",4),wunit:a("<select />").append(a("<option />").val("%").text("%")).append(a("<option />").val("px").text("px")),height:a('<input type="text" />').attr("size",4),hunit:a("<select />").append(a("<option />").val("%").text("%")).append(a("<option />").val("px").text("px")),align:a("<select />").css("width","100%").append(a("<option />").val("").text(b.rte.i18n("Not set"))).append(a("<option />").val("left").text(b.rte.i18n("Left"))).append(a("<option />").val("center").text(b.rte.i18n("Center"))).append(a("<option />").val("right").text(b.rte.i18n("Right"))).append(a("<option />").val("justify").text(b.rte.i18n("Justify"))),border:a("<div />"),padding:a("<div />"),bg:a("<div />"),bgimg:a('<input type="text" />').css("width","90%"),apply:a("<select />").css("width","100%").append(a("<option />").val("").text(b.rte.i18n("Current cell"))).append(a("<option />").val("row").text(b.rte.i18n("All cells in row"))).append(a("<option />").val("column").text(b.rte.i18n("All cells in column"))).append(a("<option />").val("table").text(b.rte.i18n("All cells in table")))},adv:{id:a('<input type="text" />'),"class":a('<input type="text" />'),style:a('<input type="text" />'),dir:a("<select />").css("width","100%").append(a("<option />").text(b.rte.i18n("Not set")).val("")).append(a("<option />").text(b.rte.i18n("Left to right")).val("ltr")).append(a("<option />").text(b.rte.i18n("Right to left")).val("rtl")),lang:a('<input type="text" />')},events:{}};
a.each(b.src,function(){for(var h in this){this[h].attr("name",h);if(this[h].attr("type")=="text"&&!this[h].attr("size")&&h!="bgimg"){this[h].css("width","100%")}}});a.each(["onblur","onfocus","onclick","ondblclick","onmousedown","onmouseup","onmouseover","onmouseout","onmouseleave","onkeydown","onkeypress","onkeyup"],function(){b.src.events[this]=a('<input type="text" />').css("width","100%")})}this.command=function(){!this.src&&g();this.cell=this.rte.dom.selfOrParent(this.rte.selection.getNode(),/^(TD|TH)$/);
if(!this.cell){return}this.src.main.type.val(this.cell.nodeName.toLowerCase());this.cell=a(this.cell);this.src.main.border.elBorderSelect({styleHeight:117,value:this.cell});this.src.main.bg.elColorPicker({palettePosition:"outer","class":"el-colorpicker ui-icon ui-icon-pencil"});this.src.main.padding.elPaddingInput({value:this.cell});var j=this.cell.css("width")||this.cell.attr("width");this.src.main.width.val(parseInt(j)||"");this.src.main.wunit.val(j.indexOf("px")!=-1?"px":"%");var q=this.cell.css("height")||this.cell.attr("height");
this.src.main.height.val(parseInt(q)||"");this.src.main.hunit.val(q.indexOf("px")!=-1?"px":"%");this.src.main.align.val(this.cell.attr("align")||this.cell.css("text-align"));this.src.main.bg.val(this.cell.css("background-color"));var t=this.cell.css("background-image");this.src.main.bgimg.val(t&&t!="none"?t.replace(/url\(([^\)]+)\)/i,"$1"):"");this.src.main.apply.val("");var r={rtl:this.rte.rtl,submit:function(h,v){h.stopPropagation();h.preventDefault();b.set();v.close()},dialog:{width:520,title:this.rte.i18n("Table cell properties")}};
var u=new elDialogForm(r);for(var p in this.src){u.tab(p,this.rte.i18n(this.labels[p]));if(p=="main"){u.append([this.rte.i18n("Width"),a("<span />").append(this.src.main.width).append(this.src.main.wunit)],"main",true).append([this.rte.i18n("Height"),a("<span />").append(this.src.main.height).append(this.src.main.hunit)],"main",true).append([this.rte.i18n("Table cell type"),this.src.main.type],"main",true).append([this.rte.i18n("Border"),this.src.main.border],"main",true).append([this.rte.i18n("Alignment"),this.src.main.align],"main",true).append([this.rte.i18n("Paddings"),this.src.main.padding],"main",true).append([this.rte.i18n("Background"),a("<span />").append(a("<span />").css({"float":"left","margin-right":"3px"}).append(this.src.main.bg)).append(this.src.main.bgimg)],"main",true).append([this.rte.i18n("Apply to"),this.src.main.apply],"main",true)
}else{for(var o in this.src[p]){var k=this.cell.attr(o)||"";if(p=="events"){k=this.rte.utils.trimEventCallback(k)}u.append([this.rte.i18n(this.labels[o]?this.labels[o]:o),this.src[p][o].val(k)],p,true)}}}u.open()};this.set=function(){var x=this.cell,B=this.src.main.apply.val();switch(this.src.main.apply.val()){case"row":x=this.cell.parent("tr").children("td,th");break;case"column":x=a(this.rte.dom.tableColumn(this.cell.get(0)));break;case"table":x=this.cell.parents("table").find("td,th");break}for(var o in this.src){if(o!="main"){for(var k in this.src[o]){var C=a.trim(this.src[o][k].val());
if(C){x.attr(k,C)}else{x.removeAttr(k)}}}}x.removeAttr("width").removeAttr("height").removeAttr("border").removeAttr("align").removeAttr("bordercolor").removeAttr("bgcolor");var D=this.src.main.type.val();var A=parseInt(this.src.main.width.val())||"";var r=parseInt(this.src.main.height.val())||"";var q=a.trim(this.src.main.bgimg.val());var z=this.src.main.border.val();var u={width:A?A+this.src.main.wunit.val():"",height:r?r+this.src.main.hunit.val():"","background-color":this.src.main.bg.val(),"background-image":q?"url("+q+")":"",border:a.trim(z.width+" "+z.style+" "+z.color),"text-align":this.src.main.align.val()||""};
var j=this.src.main.padding.val();if(j.css){u.padding=j.css}else{u["padding-top"]=j.top;u["padding-right"]=j.right;u["padding-bottom"]=j.bottom;u["padding-left"]=j.left}x=x.get();a.each(x,function(){var w=this.nodeName.toLowerCase();var F=a(this);if(w!=D){var h={};for(var t in b.src.adv){var p=F.attr(t);if(p){h[t]=p.toString()}}for(var t in b.src.events){var p=F.attr(t);if(p){h[t]=p.toString()}}var G=F.attr("colspan")||1;var E=F.attr("rowspan")||1;if(G>1){h.colspan=G}if(E>1){h.rowspan=E}F.replaceWith(a("<"+D+" />").html(F.html()).attr(h).css(u))
}else{F.css(u)}});this.rte.ui.update()};this.update=function(){if(this.rte.dom.parent(this.rte.selection.getNode(),/^TABLE$/)){this.domElem.removeClass("disabled")}else{this.domElem.addClass("disabled")}}}})(jQuery);(function(a){elRTE.prototype.ui.prototype.buttons.tbcellsmerge=function(g,f){this.constructor.prototype.constructor.call(this,g,f);var c=this;function b(){var j=c.rte.dom.selfOrParent(c.rte.selection.getStart(),/^(TD|TH)$/);var h=c.rte.dom.selfOrParent(c.rte.selection.getEnd(),/^(TD|TH)$/);
if(j&&h&&j!=h&&a(j).parents("table").get(0)==a(h).parents("table").get(0)){return[j,h]}return null}this.command=function(){var z=b();if(z){var x=this.rte.dom.indexOf(a(z[0]).parent("tr").get(0));var r=this.rte.dom.indexOf(a(z[1]).parent("tr").get(0));var q=Math.min(x,r);var u=Math.max(x,r)-q+1;var j=this.rte.dom.tableColumn(z[0],true,true);var h=this.rte.dom.tableColumn(z[1],true);var B=a.inArray(z[0],j.column);var w=a.inArray(z[1],h.column);var p=j.info.offset[B]<h.info.offset[w]?j:h;var v=j.info.offset[B]>=h.info.offset[w]?j:h;
var k=0;var t=null;var o="";this.rte.history.add();var A=a(a(z[0]).parents("table").eq(0).find("tr").get().slice(q,q+u)).each(function(E){var D=o.length;var C=false;a(this).children("td,th").each(function(){var K=a(this);var I=a.inArray(this,p.column);var H=a.inArray(this,v.column);if(I!=-1||H!=-1){C=I!=-1&&H==-1;var G=parseInt(K.attr("colspan")||1);if(E==0){k+=G}if(I!=-1&&E>0){var L=p.info.delta[I];if(L>0){if(K.css("text-align")=="left"){var F=K.clone(true);K.html("&nbsp;")}else{var F=K.clone().html("&nbsp;")
}F.removeAttr("colspan").removeAttr("id").insertBefore(this);if(L>1){F.attr("colspan",L)}}}if(H!=-1){var L=v.info.delta[H];if(G-L>1){var J=G-L-1;if(K.css("text-align")=="right"){var F=K.clone(true);K.html("&nbsp;")}else{var F=K.clone().html("&nbsp;")}F.removeAttr("colspan").removeAttr("id").insertAfter(this);if(J>1){F.attr("colspan",J)}}}if(!t){t=K}else{o+=K.html();K.remove()}}else{if(C){if(E==0){k+=parseInt(K.attr("colspan")||1)}o+=K.html();K.remove()}}});o+=D!=o.length?"<br />":""});t.removeAttr("colspan").removeAttr("rowspan").html(t.html()+o);
if(k>1){t.attr("colspan",k)}if(u>1){t.attr("rowspan",u)}this.rte.dom.fixTable(a(z[0]).parents("table").get(0))}};this.update=function(){if(b()){this.domElem.removeClass("disabled")}else{this.domElem.addClass("disabled")}}}})(jQuery);(function(a){elRTE.prototype.ui.prototype.buttons.tbcellsplit=function(c,b){this.constructor.prototype.constructor.call(this,c,b);this.command=function(){var j=this.rte.dom.selfOrParent(this.rte.selection.getNode(),/^(TD|TH)$/);if(j){this.rte.history.add();var k=parseInt(this.rte.dom.attr(j,"colspan"));
var o=parseInt(this.rte.dom.attr(j,"rowspan"));if(k>1||o>1){var u=k-1;var v=o-1;var q=this.rte.dom.parent(j,/^TABLE$/);var p=this.rte.dom.tableMatrix(q);if(u){for(var t=0;t<u;t++){a(this.rte.dom.create(j.nodeName)).html("&nbsp;").insertAfter(j)}}if(v){var x=this.rte.dom.indexesOfCell(j,p);var h=x[0];var g=x[1];for(var f=h+1;f<h+v+1;f++){var w;if(!p[f][g].nodeName){if(p[f][g-1].nodeName){w=p[f][g-1]}else{for(var t=g-1;t>=0;t--){if(p[f][t].nodeName){w=p[f][t];break}}}if(w){for(var t=0;t<=u;t++){a(this.rte.dom.create(w.nodeName)).html("&nbsp;").insertAfter(w)
}}}}}a(j).removeAttr("colspan").removeAttr("rowspan");this.rte.dom.fixTable(q)}}this.rte.ui.update(true)};this.update=function(){var f=this.rte.dom.selfOrParent(this.rte.selection.getNode(),/^(TD|TH)$/);if(f&&(parseInt(this.rte.dom.attr(f,"colspan"))>1||parseInt(this.rte.dom.attr(f,"rowspan"))>1)){this.domElem.removeClass("disabled")}else{this.domElem.addClass("disabled")}}}})(jQuery);(function(a){elRTE.prototype.ui.prototype.buttons.tbcolbefore=function(f,c){this.constructor.prototype.constructor.call(this,f,c);
var b=this;this.command=function(){var g=this;var h=this.rte.dom.tableColumn(this.rte.selection.getNode(),false,true);if(h.length){this.rte.history.add();a.each(h,function(){var k=a(this);var j=parseInt(k.attr("colspan")||1);if(j>1){k.attr("colspan",j+1)}else{var o=a(g.rte.dom.create(this.nodeName)).html("&nbsp;");if(g.name=="tbcolbefore"){o.insertBefore(this)}else{o.insertAfter(this)}}});this.rte.ui.update()}};this.update=function(){if(this.rte.dom.selfOrParent(this.rte.selection.getNode(),/^(TD|TH)$/)){this.domElem.removeClass("disabled")
}else{this.domElem.addClass("disabled")}}};elRTE.prototype.ui.prototype.buttons.tbcolafter=elRTE.prototype.ui.prototype.buttons.tbcolbefore})(jQuery);(function(a){elRTE.prototype.ui.prototype.buttons.tbcolrm=function(f,c){this.constructor.prototype.constructor.call(this,f,c);var b=this;this.command=function(){var p=this.rte.selection.getNode();var o=this.rte.dom.selfOrParent(p,/^(TD|TH)$/);var k=a(o).prev("td,th").get(0);var j=a(o).next("td,th").get(0);var g=this.rte.dom.parent(p,/^TABLE$/);var h=this.rte.dom.tableColumn(p,false,true);
if(h.length){this.rte.history.add();a.each(h,function(){var r=a(this);var q=parseInt(r.attr("colspan")||1);if(q>1){r.attr("colspan",q-1)}else{r.remove()}});this.rte.dom.fixTable(g);if(k||j){this.rte.selection.selectContents(k?k:j).collapse(true)}this.rte.ui.update(true)}};this.update=function(){if(this.rte.dom.selfOrParent(this.rte.selection.getNode(),/^(TD|TH)$/)){this.domElem.removeClass("disabled")}else{this.domElem.addClass("disabled")}}}})(jQuery);elRTE.prototype.ui.prototype.buttons.tbrowbefore=function(b,a){this.constructor.prototype.constructor.call(this,b,a);
this.command=function(){var h=this.rte.selection.getNode();var t=this.rte.dom.selfOrParent(h,/^(TD|TH)$/);var f=this.rte.dom.selfOrParent(t,/^TR$/);var w=this.rte.dom.tableMatrix(this.rte.dom.selfOrParent(t,/^TABLE$/));if(t&&f&&w){this.rte.history.add();var u=this.name=="tbrowbefore";var q=$(f).prevAll("tr").length;var j=0;var p=[];function k(c,r){while(r>0){r--;if(w[r]&&w[r][c]&&w[r][c].nodeName){return w[r][c]}}}for(var o=0;o<w[q].length;o++){if(w[q][o]&&w[q][o].nodeName){var v=$(w[q][o]);var g=parseInt(v.attr("colspan")||1);
if(parseInt(v.attr("rowspan")||1)>1){if(u){j+=g}else{p.push(v)}}else{j+=g}}else{if(w[q][o]=="-"){v=k(o,q);v&&p.push($(v))}}}var x=$(this.rte.dom.create("tr"));for(var o=0;o<j;o++){x.append("<td>&nbsp;</td>")}if(u){x.insertBefore(f)}else{x.insertAfter(f)}$.each(p,function(){$(this).attr("rowspan",parseInt($(this).attr("rowspan")||1)+1)});this.rte.ui.update()}};this.update=function(){if(this.rte.dom.selfOrParent(this.rte.selection.getNode(),/^TR$/)){this.domElem.removeClass("disabled")}else{this.domElem.addClass("disabled")
}}};elRTE.prototype.ui.prototype.buttons.tbrowafter=elRTE.prototype.ui.prototype.buttons.tbrowbefore;(function(a){elRTE.prototype.ui.prototype.buttons.tbrowrm=function(f,c){this.constructor.prototype.constructor.call(this,f,c);var b=this;this.command=function(){var h=this.rte.selection.getNode(),x=this.rte.dom.selfOrParent(h,/^(TD|TH)$/),g=this.rte.dom.selfOrParent(x,/^TR$/),q=this.rte.dom.selfOrParent(x,/^TABLE$/),A=this.rte.dom.tableMatrix(q);if(x&&g&&A.length){this.rte.history.add();if(A.length==1){a(q).remove();
return this.rte.ui.update()}var u=[];var v=a(g).prevAll("tr").length;function p(r,C){while(C>0){C--;if(A[C]&&A[C][r]&&A[C][r].nodeName){return A[C][r]}}}function B(C,r){y=v+1;var E=null;if(A[y]){for(var D=0;D<r;D++){if(A[y][D]&&A[y][D].nodeName){E=A[y][D]}}C=C.remove();if(E){C.insertAfter(E)}else{C.prependTo(a(g).next("tr").eq(0))}}}function o(C){for(var r=0;r<C.length;r++){if(C[r]==x){return r<C.length-1?C[r+1]:C[r-1]}}}for(var t=0;t<A[v].length;t++){var z=null;var j=false;if(A[v][t]&&A[v][t].nodeName){z=A[v][t];
j=true}else{if(A[v][t]=="-"&&(z=p(t,v))){j=false}}if(z){z=a(z);var k=parseInt(z.attr("rowspan")||1);if(k>1){z.attr("rowspan",k-1);j&&B(z,t,v)}}}var w=o(this.rte.dom.tableColumn(x));if(w){this.rte.selection.selectContents(w).collapse(true)}a(g).remove()}this.rte.ui.update()};this.update=function(){if(this.rte.dom.selfOrParent(this.rte.selection.getNode(),/^TR$/)){this.domElem.removeClass("disabled")}else{this.domElem.addClass("disabled")}}}})(jQuery);(function(a){elRTE.prototype.ui.prototype.buttons.undo=function(c,b){this.constructor.prototype.constructor.call(this,c,b);
this.command=function(){if(this.name=="undo"&&this.rte.history.canBack()){this.rte.history.back();this.rte.ui.update()}else{if(this.name=="redo"&&this.rte.history.canFwd()){this.rte.history.fwd();this.rte.ui.update()}}};this.update=function(){this.domElem.toggleClass("disabled",this.name=="undo"?!this.rte.history.canBack():!this.rte.history.canFwd())}};elRTE.prototype.ui.prototype.buttons.redo=elRTE.prototype.ui.prototype.buttons.undo})(jQuery);(function(a){elRTE.prototype.ui.prototype.buttons.unlink=function(c,b){this.constructor.prototype.constructor.call(this,c,b);
this.command=function(){var k=this.rte.selection.getNode(),f=this.rte.dom.selfOrParentLink(k);function j(o){return o.nodeName=="A"&&o.href}if(!f){var h=a.browser.msie?this.rte.selection.selected():this.rte.selection.selected({wrap:false});if(h.length){for(var g=0;g<h.length;g++){if(j(h[g])){f=h[g];break}}if(!f){f=this.rte.dom.parent(h[0],j)||this.rte.dom.parent(h[h.length-1],j)}}}if(f){this.rte.history.add();this.rte.selection.select(f);this.rte.doc.execCommand("unlink",false,null);this.rte.ui.update(true)
}};this.update=function(){var f=this.rte.selection.getNode();if(this.rte.dom.selfOrParentLink(f)){this.domElem.removeClass("disabled").addClass("active")}else{if(this.rte.dom.selectionHas(function(g){return g.nodeName=="A"&&g.href})){this.domElem.removeClass("disabled").addClass("active")}else{this.domElem.addClass("disabled").removeClass("active")}}}}})(jQuery);;
(function($) {

// override elBorderSelect
$.fn.elBorderSelect = function(o) {

    var $self = this;
    var self  = this.eq(0);
    var opts  = $.extend({}, $.fn.elBorderSelect.defaults, o);
    var width = $('<input type="text" />')
        .attr({'name' : opts.name+'[width]', size : 3}).css('text-align', 'right')
        .change(function() { $self.change();});

    var color = $('<div />').css('position', 'relative')
        .elColorPicker({
            'class'         : 'el-colorpicker ui-icon ui-icon-pencil',
            name            : opts.name+'[color]',
            palettePosition : 'outer',
            change          : function() { $self.change(); }
        });


    var style = $('<select></select>').change(function() { $self.change();});
    var style_options = {
            ''       : 'none',
            solid    : 'solid',
            dashed   : 'dashed',
            dotted   : 'dotted',
            'double' : 'double',
            groove   : 'groove',
            ridge    : 'ridge',
            inset    : 'inset',
            outset   : 'outset'
    };
    for (var i in style_options) {
        style.append('<option value="' + i + '">' + style_options[i] + '</option>');
    }

    self.empty().addClass(opts['class']).attr('name', opts.name||'')
    .append(
        $('<table />').attr('cellspacing', 0).append(
            $('<tr />')
                .append($('<td />').append(width).append(' px'))
                .append($('<td />').append(style))
                .append($('<td />').append(color))
        )
    );

    function rgb2hex(str) {
        function hex(x)  {
            hexDigits = ["0", "1", "2", "3", "4", "5", "6", "7", "8","9", "a", "b", "c", "d", "e", "f"];
            return !x  ? "00" : hexDigits[(x - x % 16) / 16] + hexDigits[x% 16];
        }
        var rgb = (str||'').match(/\(([0-9]{1,3}),\s*([0-9]{1,3}),\s*([0-9]{1,3})\)/);
        return rgb ? "#" + hex(rgb[1]) + hex(rgb[2]) + hex(rgb[3]) : '';
    }

    function toPixels(num) {
        if (!num) {
            return num;
        }
        var m = num.match(/([0-9]+\.?[0-9]*)\s*(px|pt|em|%)/);
        if (m) {
            num  = m[1];
            unit = m[2];
        }
        if (num[0] == '.') {
            num = '0'+num;
        }
        num = parseFloat(num);

        if (isNaN(num)) {
            return '';
        }
        var base = parseInt($(document.body).css('font-size')) || 16;
        switch (unit) {
            case 'em': return parseInt(num*base);
            case 'pt': return parseInt(num*base/12);
            case '%' : return parseInt(num*base/100);
        }
        return num;
    }

    this.change = function() {
        opts.change && opts.change(this.val());
    };

    this.val = function(v) {
        var w, s, c, b, m;

        if (!v && v !== '') {
            w = parseInt(width.val());
            w = !isNaN(w) ? w+'px' : '';
            s = style.val();
            c = color.val();
            return {
                width : w,
                style : s,
                color : c,
                css   : $.trim(w+' '+s+' '+c)
            };
        } else {
            b = '';
            if (v.nodeName || v.css) {
                if (!v.css) {
                    v = $(v);
                }
                b = v.css('border');
                if ((b = v.css('border'))) {
                    w = s = c = b;
                } else {
                    w = v.css('border-width');
                    s = v.css('border-style');
                    c = v.css('border-color');
                }

            } else {
                w = v.width||'';
                s = v.style||'';
                c = v.color||'';
            }

            width.val(toPixels(w));
            m = s ? s.match(/(solid|dashed|dotted|double|groove|ridge|inset|outset)/i) :'';
            style.val(m ? m[1] : '');
            color.val(c.indexOf('#') === 0 ? c : rgb2hex(c));
            return this;
        }
    };

    this.val(opts.value);
    return this;
};

$.fn.elBorderSelect.defaults = {
    name      : 'el-borderselect',
    'class'   : 'el-borderselect',
    value     : {},
    change    : null
};

// wa panels
elRTE.prototype.options.panels.wa_style = ["bold", "italic", "underline", "strikethrough"];
elRTE.prototype.options.panels.wa_image = ["wa_image"];
elRTE.prototype.options.panels.wa_links = ["wa_link", "unlink"];
elRTE.prototype.options.panels.wa_elements = ["wa_horizontalrule", "blockquote", "div", "stopfloat"];
elRTE.prototype.options.panels.wa_tables = ["wa_table", "wa_tableprops", "tablerm", "tbrowbefore", "tbrowafter", "tbrowrm", "tbcolbefore", "tbcolafter", "tbcolrm", "wa_tbcellprops", "tbcellsmerge", "tbcellsplit"];

elRTE.prototype.options.buttons['wa_link'] = elRTE.prototype.options.buttons['link'];
elRTE.prototype.ui.prototype.buttons.wa_link = function(rte, name) {
    this.constructor.prototype.constructor.call(this, rte, name);
    var self = this;
    this.img = false;

    function init() {
        self.src = {
            href   : $('<input type="text" />'),
            title  : $('<input type="text" />'),
            target : $('<select />')
                .append($('<option />').text(self.rte.i18n('In this window')).val(''))
                .append($('<option />').text(self.rte.i18n('In new window (_blank)')).val('_blank'))
        };
    }

    this.command = function() {
        var n = this.rte.selection.getNode(),
            sel, i, v, link, href, s;

        !this.src && init();

        function isLink(n) {
            return n.nodeName == 'A' && n.href;
        }

        this.link = this.rte.dom.selfOrParentLink(n);

        if (!this.link) {
            sel = $.browser.msie ? this.rte.selection.selected() : this.rte.selection.selected({wrap : false});
            if (sel.length) {
                for (i=0; i < sel.length; i++) {
                    if (isLink(sel[i])) {
                        this.link = sel[i];
                        break;
                    }
                };
                if (!this.link) {
                    this.link = this.rte.dom.parent(sel[0], isLink) || this.rte.dom.parent(sel[sel.length-1], isLink);
                }
            }
        }

        this.link = this.link ? $(this.link) : $(this.rte.doc.createElement('a'));
        this.img = n.nodeName == 'IMG' ? n : null;

        var d = $('<div id="elrte-wa_link" class="fields form"></div>');
        var values = {
            href: this.rte.i18n('URL'),
            title: this.rte.i18n('Title'),
            target: this.rte.i18n('Target')
        };
        for (var n in values) {
            var t = $('<div class="field"></div>').append($('<div class="name"></div>').html(values[n]));
            t.append($('<div class="value"></div>').append(self.src[n]));
            d.append(t);
        }
        d.waDialog({
            esc: true,
            width: '400px',
            height: '170px',
            className: 'wa-elrte-dialog',
            title : this.rte.i18n('Link'),
            buttons: '<input type="submit" class="button green" value="' + this.rte.i18n('OK') + '"> ' + this.rte.i18n('or') + ' <a href="#" class="inline-link cancel"><b><i>' + this.rte.i18n('cancel') + '</i></b></a>',
            onClose: function () {
                self.rte.browser.msie && self.rte.selection.restoreIERange();
                self.rte.selection.moveToBookmark(self.rte.selection.getBookmark());
            },
            onSubmit: function (d) {
                self.set();
                d.trigger('close');
                return false;
            }
        });

        link = this.link.get(0);
        this.src.href.val(this.rte.dom.attr(link, 'href'));
    };

    this.update = function() {
        var n = this.rte.selection.getNode();

        if (this.rte.dom.selfOrParentLink(n)) {
            this.domElem.removeClass('disabled').addClass('active');
        } else if (this.rte.dom.selectionHas(function(n) { return n.nodeName == 'A' && n.href; })) {
            this.domElem.removeClass('disabled').addClass('active');
        } else if (!this.rte.selection.collapsed() || n.nodeName == 'IMG') {
            this.domElem.removeClass('disabled active');
        } else {
            this.domElem.addClass('disabled').removeClass('active');
        }
    };

    this.set = function() {
        var href, fakeURL;
        this.rte.history.add();
        href = this.src.href.val();
        if (this.img && this.img.parentNode) {
            this.link = $(this.rte.dom.create('a')).attr('href', href);
            this.rte.dom.wrap(this.img, this.link[0]);
        } else if (!this.link[0].parentNode) {
            fakeURL = '#--el-editor---'+Math.random();
            this.rte.doc.execCommand('createLink', false, fakeURL);
            this.link = $('a[href="'+fakeURL+'"]', this.rte.doc);
            this.link.each(function() {
                var $this = $(this);

                // удаляем ссылки вокруг пустых элементов
                if (!$.trim($this.html()) && !$.trim($this.text())) {
                    $this.replaceWith($this.text()); //  сохраняем пробелы :)
                }
            });
        }

        this.src.href.val(href);
        for (var n in this.src) {
            var v = $.trim(this.src[n].val());
            if (v) {
                this.link.attr(n, v);
            } else {
                this.link.removeAttr(n);
            }
        };

        this.img && this.rte.selection.select(this.img);
        this.rte.ui.update(true);

    };

};
elRTE.prototype.options.buttons['wa_horizontalrule'] = elRTE.prototype.options.buttons['horizontalrule'];
elRTE.prototype.ui.prototype.buttons.wa_horizontalrule = function(rte, name) {
    this.constructor.prototype.constructor.call(this, rte, name);
    var self = this;
    this.src = {
        width   : $('<input type="text" />').attr({'name' : 'width', 'size' : 4}).css('text-align', 'right'),
        wunit   : $('<select />').attr('name', 'wunit')
                    .append($('<option />').val('%').text('%'))
                    .append($('<option />').val('px').text('px'))
                    .val('%'),
        height  : $('<input type="text" />').attr({'name' : 'height', 'size' : 4}).css('text-align', 'right'),
        bg      : $('<div />')
    };

    this.command = function() {
        if (!this.src.bg.is('.el-colorpicker')) {
            this.src.bg.elColorPicker({palettePosition : 'outer', 'class' : 'el-colorpicker ui-icon ui-icon-pencil'});
        }

        var n   = this.rte.selection.getEnd();
        this.hr = n.nodeName == 'HR' ? $(n) : $(rte.doc.createElement('hr')).css({width : '100%', height : '1px'});

        var _w  = this.hr.css('width') || this.hr.attr('width');
        this.src.width.val(parseInt(_w) || 100);
        this.src.wunit.val(_w.indexOf('px') != -1 ? 'px' : '%');

        this.src.height.val( this.rte.utils.toPixels(this.hr.css('height') || this.hr.attr('height')) || 1) ;

        this.src.bg.val(this.rte.utils.color2Hex(this.hr.css('background-color')));

        var d = $('<div id="elrte-wa_horizontalrule" class="fields form"></div>')
                .append($('<div class="field"><div class="name">' + this.rte.i18n('Width') + '</div></div>').append(
                    $('<div class="value"></div>').append(this.src.width).append(this.src.wunit)
                ))
                .append($('<div class="field"><div class="name">' + this.rte.i18n('Height') + '</div></div>').append(
                    $('<div class="value"></div>').append(this.src.height).append(' px')
                ))
                .append($('<div class="field"><div class="name">' + this.rte.i18n('Background') + '</div></div>').append(
                    $('<div class="value"></div>').append(this.src.bg)
                ));
        d.waDialog({
            esc: true,
            width: '400px',
            height: '170px',
            className: 'wa-elrte-dialog',
            title : this.rte.i18n('Horizontal rule'),
            buttons: '<input type="submit" class="button green" value="' + this.rte.i18n('OK') + '"> ' + this.rte.i18n('or') + ' <a href="#" class="inline-link cancel"><b><i>' + this.rte.i18n('cancel') + '</i></b></a>',
            onSubmit: function (d) {
                self.set();
                d.trigger('close');
                return false;
            }
        });
    };

    this.update = function() {
        this.domElem.removeClass('disabled');
        if (this.rte.selection.getEnd().nodeName == 'HR') {
            this.domElem.addClass('active');
        } else {
            this.domElem.removeClass('active');
        }
    };

    this.set = function() {
        this.rte.history.add();
        !this.hr.parentNode && this.rte.selection.insertNode(this.hr.get(0));

        this.hr.removeAttr('width')
            .removeAttr('height')
            .removeAttr('align')
            .attr('noshade', true)
            .css({
                width  : (parseInt(this.src.width.val()) || 100)+this.src.wunit.val(),
                height : parseInt(this.src.height.val()) || 1,
                'background-color' : this.src.bg.val()
            });
        this.rte.ui.update();
    };
};

elRTE.prototype.options.buttons['wa_table'] = elRTE.prototype.options.buttons['table'];
elRTE.prototype.ui.prototype.buttons.wa_table = function(rte, name) {
    this.constructor.prototype.constructor.call(this, rte, name);
    var self    = this;
    this.src    = null;
    this.labels = null;

    function init() {
        self.src = {
            rows    : $('<input type="text" />').attr('size', 5).val(2),
            cols    : $('<input type="text" />').attr('size', 5).val(2),
            width   : $('<input type="text" />').attr('size', 5),
            wunit   : $('<select />')
                        .append($('<option />').val('%').text('%'))
                        .append($('<option />').val('px').text('px')),
            height  : $('<input type="text" />').attr('size', 5),
            hunit   : $('<select />')
                        .append($('<option />').val('%').text('%'))
                        .append($('<option />').val('px').text('px')),
            align   : $('<select />')
                        .append($('<option />').val('').text(self.rte.i18n('Not set')))
                        .append($('<option />').val('left').text(self.rte.i18n('Left')))
                        .append($('<option />').val('center').text(self.rte.i18n('Center')))
                        .append($('<option />').val('right').text(self.rte.i18n('Right'))),
            spacing : $('<input type="text" />').attr('size', 5),
            padding : $('<input type="text" />').attr('size', 5),
            border  : $('<div />'),
            bg      : $('<div />'),
            bgimg   : $('<input type="text" />').css('width', '90%')
        };

        $.each(self.src, function(n, el) {
            el.attr('name', n);
            var t = el.get(0).nodeName;
            if (t == 'INPUT' && n != 'bgimg') {
                el.css(el.attr('size') ? {'text-align' : 'right'} : {width : '100%'});
            } else if (t == 'SELECT' && n!='wunit' && n!='hunit') {
                el.css('width', '100%');
            }
        });

        self.src.bgimg.change(function() {
            var t = $(this);
            t.val(self.rte.utils.absoluteURL(t.val()));
        });

    }

    this.command = function() {
        var n = this.rte.dom.selfOrParent(this.rte.selection.getNode(), /^TABLE$/);

        if (this.name == 'table') {
            this.table = $(this.rte.doc.createElement('table'));
        } else {
            this.table = n ? $(n) : $(this.rte.doc.createElement('table'));
        }

        !this.src && init();
        this.src.border.elBorderSelect({styleHeight : 117});
        if (!this.src.bg.is('.el-colorpicker')) {
            this.src.bg.elColorPicker({palettePosition : 'outer', 'class' : 'el-colorpicker ui-icon ui-icon-pencil'});
        }

        if (this.table.parents().length) {
            this.src.rows.val('').attr('disabled', true);
            this.src.cols.val('').attr('disabled', true);
        } else {
            this.src.rows.val(2).removeAttr('disabled');
            this.src.cols.val(2).removeAttr('disabled');
        }

        var w = this.table.css('width') || this.table.attr('width');
        this.src.width.val(parseInt(w)||'');
        this.src.wunit.val(w.indexOf('px') != -1 ? 'px' : '%');

        var h = this.table.css('height') || this.table.attr('height');
        this.src.height.val(parseInt(h)||'');
        this.src.hunit.val(h && h.indexOf('px') != -1 ? 'px' : '%');

        var f = this.table.css('float');
        this.src.align.val('');
        if (f == 'left' || f == 'right') {
            this.src.align.val(f);
        } else {
            var ml = this.table.css('margin-left');
            var mr = this.table.css('margin-right');
            if (ml == 'auto' && mr == 'auto') {
                this.src.align.val('center');
            }
        }

        this.src.border.val(this.table);

        this.src.bg.val(this.table.css('background-color'));
        var bgimg = (this.table.css('background-image')||'').replace(/url\(([^\)]+)\)/i, "$1");
        this.src.bgimg.val(bgimg!='none' ? bgimg : '');

        var d = $('<table></table>');

        var rows = [[0, 1, 2]];
        rows[0][0] = $('<table />')
            .append($('<tr />').append('<td>'+this.rte.i18n('Rows')+'</td>').append($('<td />').append(this.src.rows)))
            .append($('<tr />').append('<td>'+this.rte.i18n('Columns')+'</td>').append($('<td />').append(this.src.cols)));
        rows[0][1] = $('<table />')
            .append($('<tr />').append('<td>'+this.rte.i18n('Width')+'</td>').append($('<td />').append(this.src.width).append(this.src.wunit)))
            .append($('<tr />').append('<td>'+this.rte.i18n('Height')+'</td>').append($('<td />').append(this.src.height).append(this.src.hunit)));
        rows[0][2] = $('<table />')
            .append($('<tr />').append('<td>'+this.rte.i18n('Spacing')+'</td>').append($('<td />').append(this.src.spacing.val(this.table.attr('cellspacing')||''))))
            .append($('<tr />').append('<td>'+this.rte.i18n('Padding')+'</td>').append($('<td />').append(this.src.padding.val(this.table.attr('cellpadding')||''))));
        rows.push([this.rte.i18n('Border'), this.src.border]);
        rows.push([this.rte.i18n('Alignment'),     this.src.align]);
        rows.push([this.rte.i18n('Background'),    $('<span />').append($('<span />').css({'float' : 'left', 'margin-right' : '3px'}).append(this.src.bg)).append(this.src.bgimg)]);
        for (var i = 0; i < rows.length; i++) {
            var tr = $('<tr></tr>');
            for (var j = 0; j < rows[i].length; j++) {
                tr.append($('<td></td>').append(rows[i][j]));
            }
            d.append(tr);
        }
        d.waDialog({
            esc: true,
            width: '530px',
            height: '300px',
            'class': 'wa-elrte-dialog',
            title : this.rte.i18n('Table'),
            buttons: '<input type="submit" class="button green" value="' + this.rte.i18n('OK') + '"> ' + this.rte.i18n('or') + ' <a href="#" class="inline-link cancel"><b><i>' + this.rte.i18n('cancel') + '</i></b></a>',
            onSubmit: function (d) {
                self.set();
                d.trigger('close');
                return false;
            }
        });

    };

    this.set = function() {

        if (!this.table.parents().length) {
            var r = parseInt(this.src.rows.val()) || 0;
            var c = parseInt(this.src.cols.val()) || 0;
            if (r<=0 || c<=0) {
                return;
            }
            this.rte.history.add();
            var b = $(this.rte.doc.createElement('tbody')).appendTo(this.table);

            for (var i=0; i < r; i++) {
                var tr = '<tr>';
                for (var j=0; j < c; j++) {
                    tr += '<td>&nbsp;</td>';
                }
                b.append(tr+'</tr>');
            };

        } else {
            this.table
                .removeAttr('width')
                .removeAttr('height')
                .removeAttr('border')
                .removeAttr('align')
                .removeAttr('bordercolor')
                .removeAttr('bgcolor')
                .removeAttr('cellspacing')
                .removeAttr('cellpadding')
                .removeAttr('style');
        }

        var spacing, padding;

        if ((spacing = parseInt(this.src.spacing.val())) && spacing>=0) {
            this.table.attr('cellspacing', spacing);
        }

        if ((padding = parseInt(this.src.padding.val())) && padding>=0) {
            this.table.attr('cellpadding', padding);
        }

        var
            w = parseInt(this.src.width.val()) || '',
            h = parseInt(this.src.height.val()) || '',
            i = $.trim(this.src.bgimg.val()),
            b = this.src.border.val(),
            f = this.src.align.val();
        this.table.css({
            width              : w ? w+this.src.wunit.val() : '',
            height             : h ? h+this.src.hunit.val() : '',
            border             : $.trim(b.width+' '+b.style+' '+b.color),
            'background-color' : this.src.bg.val(),
            'background-image' : i ? 'url('+i+')' : ''
        });
        if ((f=='left' || f=='right') && this.table.css('margin-left')!='auto'  && this.table.css('margin-right')!='auto') {
            this.table.css('float', f);
        }
        if (!this.table.attr('style')) {
            this.table.removeAttr('style');
        }
        if (!this.table.parents().length) {
            this.rte.selection.insertNode(this.table.get(0), true);
        }
        this.rte.ui.update();
    };

    this.update = function() {
        this.domElem.removeClass('disabled');
        if (this.name == 'tableprops' && !this.rte.dom.selfOrParent(this.rte.selection.getNode(), /^TABLE$/)) {
            this.domElem.addClass('disabled').removeClass('active');
        }
    };

};

elRTE.prototype.options.buttons['wa_tableprops'] = elRTE.prototype.options.buttons['tableprops'];
elRTE.prototype.ui.prototype.buttons.wa_tableprops = elRTE.prototype.ui.prototype.buttons.wa_table;


elRTE.prototype.options.buttons['wa_tbcellprops'] = elRTE.prototype.options.buttons['tbcellprops'];
elRTE.prototype.ui.prototype.buttons.wa_tbcellprops = function(rte, name) {
    this.constructor.prototype.constructor.call(this, rte, name);
    var self = this;
    this.src = null;
    this.labels = null;

    function init() {
        self.labels = {
            main    : 'Properies',
            adv     : 'Advanced',
            events  : 'Events',
            id      : 'ID',
            'class' : 'Css class',
            style   : 'Css style',
            dir     : 'Script direction',
            lang    : 'Language'
        }

        self.src = {
                type    : $('<select />').css('width', '100%')
                    .append($('<option />').val('td').text(self.rte.i18n('Data')))
                    .append($('<option />').val('th').text(self.rte.i18n('Header'))),
                width   : $('<input type="text" />').attr('size', 4),
                wunit   : $('<select />')
                    .append($('<option />').val('%').text('%'))
                    .append($('<option />').val('px').text('px')),
                height  : $('<input type="text" />').attr('size', 4),
                hunit   : $('<select />')
                    .append($('<option />').val('%').text('%'))
                    .append($('<option />').val('px').text('px')),
                align   : $('<select />').css('width', '100%')
                    .append($('<option />').val('').text(self.rte.i18n('Not set')))
                    .append($('<option />').val('left').text(self.rte.i18n('Left')))
                    .append($('<option />').val('center').text(self.rte.i18n('Center')))
                    .append($('<option />').val('right').text(self.rte.i18n('Right')))
                    .append($('<option />').val('justify').text(self.rte.i18n('Justify'))),
                border  : $('<div />'),
                padding  : $('<div />'),
                bg      : $('<div />'),
                bgimg   : $('<input type="text" />').css('width', '90%'),
                apply   : $('<select />').css('width', '100%')
                    .append($('<option />').val('').text(self.rte.i18n('Current cell')))
                    .append($('<option />').val('row').text(self.rte.i18n('All cells in row')))
                    .append($('<option />').val('column').text(self.rte.i18n('All cells in column')))
                    .append($('<option />').val('table').text(self.rte.i18n('All cells in table')))
        }

        $.each(self.src, function(n, el) {
                if (el.attr('type') == 'text' && !el.attr('size') && n!='bgimg') {
                    el.css('width', '100%')
                }
        });

    }

    this.command = function() {
        !this.src && init();
        this.cell = this.rte.dom.selfOrParent(this.rte.selection.getNode(), /^(TD|TH)$/);
        if (!this.cell) {
            return;
        }
        this.src.type.val(this.cell.nodeName.toLowerCase());
        this.cell = $(this.cell);
        this.src.border.elBorderSelect({styleHeight : 117, value : this.cell});
        this.src.bg.elColorPicker({palettePosition : 'outer', 'class' : 'el-colorpicker ui-icon ui-icon-pencil'});
        this.src.padding.elPaddingInput({ value : this.cell});

        var w = this.cell.css('width') || this.cell.attr('width');
        this.src.width.val(parseInt(w)||'');
        this.src.wunit.val(w.indexOf('px') != -1 ? 'px' : '%');

        var h = this.cell.css('height') || this.cell.attr('height');
        this.src.height.val(parseInt(h)||'');
        this.src.hunit.val(h.indexOf('px') != -1 ? 'px' : '%');

        this.src.align.val(this.cell.attr('align') || this.cell.css('text-align'));
        this.src.bg.val(this.cell.css('background-color'));
        var bgimg = this.cell.css('background-image');
        this.src.bgimg.val(bgimg && bgimg!='none' ? bgimg.replace(/url\(([^\)]+)\)/i, "$1") : '');
        this.src.apply.val('');

        var d = $('<table></table>');
        d.append($('<tr />').append('<td>'+this.rte.i18n('Width')+'</td>').append($('<td />').append($('<span />').append(this.src.width).append(this.src.wunit))));
        d.append($('<tr />').append('<td>'+this.rte.i18n('Height')+'</td>').append($('<td />').append($('<span />').append(this.src.height).append(this.src.hunit))));
        d.append($('<tr />').append('<td>'+this.rte.i18n('Table cell type')+'</td>').append($('<td />').append(this.src.type)));
        d.append($('<tr />').append('<td>'+this.rte.i18n('Border')+'</td>').append($('<td />').append(this.src.border)));
        d.append($('<tr />').append('<td>'+this.rte.i18n('Align')+'</td>').append($('<td />').append(this.src.align)));
        d.append($('<tr />').append('<td>'+this.rte.i18n('Paddings')+'</td>').append($('<td />').append(this.src.padding)));
        d.append($('<tr />').append('<td>'+this.rte.i18n('Background')+'</td>').append($('<td />').append($('<span />').append($('<span />').css({'float' : 'left', 'margin-right' : '3px'}).append(this.src.bg)).append(this.src.bgimg))));
        d.append($('<tr />').append('<td>'+this.rte.i18n('Apply to')+'</td>').append($('<td />').append(this.src.apply)));
        d.waDialog({
            esc: true,
            width: '530px',
            height: '300px',
            'class': 'wa-elrte-dialog',
            title : this.rte.i18n('Table cell properties'),
            buttons: '<input type="submit" class="button green" value="' + this.rte.i18n('OK') + '"> ' + this.rte.i18n('or') + ' <a href="#" class="inline-link cancel"><b><i>' + this.rte.i18n('cancel') + '</i></b></a>',
            onSubmit: function (d) {
                self.set();
                d.trigger('close');
                return false;
            }
        });
    }

    this.set = function() {
        // $(t).remove();
        var target = this.cell,
            apply  = this.src.apply.val();
        switch (this.src.apply.val()) {
            case 'row':
                target = this.cell.parent('tr').children('td,th');
                break;

            case 'column':
                target = $(this.rte.dom.tableColumn(this.cell.get(0)));
                break;

            case 'table':
                target = this.cell.parents('table').find('td,th');
                break;
        }

        target.removeAttr('width')
            .removeAttr('height')
            .removeAttr('border')
            .removeAttr('align')
            .removeAttr('bordercolor')
            .removeAttr('bgcolor');

        var t = this.src.type.val();
        var w = parseInt(this.src.width.val()) || '';
        var h = parseInt(this.src.height.val()) || '';
        var i = $.trim(this.src.bgimg.val());
        var b = this.src.border.val();
        var css = {
            'width'            : w ? w+this.src.wunit.val() : '',
            'height'           : h ? h+this.src.hunit.val() : '',
            'background-color' : this.src.bg.val(),
            'background-image' : i ? 'url('+i+')' : '',
            'border'           : $.trim(b.width+' '+b.style+' '+b.color),
            'text-align'       : this.src.align.val() || ''
        };
        var p = this.src.padding.val();
        if (p.css) {
            css.padding = p.css;
        } else {
            css['padding-top']    = p.top;
            css['padding-right']  = p.right;
            css['padding-bottom'] = p.bottom;
            css['padding-left']   = p.left;
        }

        target = target.get();

        $.each(target, function() {
            var type = this.nodeName.toLowerCase();
            var $this = $(this);
            if (type != t) {

                var attr = {}
                for (var i in self.src.adv) {
                    var v = $this.attr(i)
                    if (v) {
                        attr[i] = v.toString();
                    }
                }
                for (var i in self.src.events) {
                    var v = $this.attr(i)
                    if (v) {
                        attr[i] = v.toString();
                    }
                }
                var colspan = $this.attr('colspan')||1;
                var rowspan = $this.attr('rowspan')||1;
                if (colspan>1) {
                    attr.colspan = colspan;
                }
                if (rowspan>1) {
                    attr.rowspan = rowspan;
                }

                $this.replaceWith($('<'+t+' />').html($this.html()).attr(attr).css(css) );

            } else {
                $this.css(css);
            }
        });

        this.rte.ui.update();
    }

    this.update = function() {
        if (this.rte.dom.parent(this.rte.selection.getNode(), /^TABLE$/)) {
            this.domElem.removeClass('disabled');
        } else {
            this.domElem.addClass('disabled');
        }
    }

}

elRTE.prototype.options.buttons['wa_image'] = elRTE.prototype.options.buttons['image'];
elRTE.prototype.ui.prototype.buttons.wa_image = function(rte, name) {
    this.constructor.prototype.constructor.call(this, rte, name);
    var self = this,
        rte  = self.rte,
        proportion = 0,
        width = 0,
        height = 0,
        bookmarks = null,
        dialog_row = function(name, value) {
            var el = $('<div class="field"></div>')
                    .append($('<div class="name"></div>').html(name));
            if (value instanceof Array) {
                for (var i = 0; i < value.length; i++) {
                    el.append($('<div class="value"></div>').append(value[i]));
                }
            } else {
                el.append($('<div class="value"></div>').append(value));
            }
            return el;
        },
        reset = function(nosrc) {
            $.each(self.src, function(n, el) {
                if (n == 'src' && nosrc) {
                    return;
                }
                el.val('');
            });
        },
        values = function(img) {
            $.each(self.src, function(n, el) {
                var val, w, c, s, border;

                if (n == 'width') {
                    val = img.width();
                } else if (n == 'height') {
                    val = img.height();
                } else if (n == 'border') {
                    val = '';
                    border = img.css('border') || rte.utils.parseStyle(img.attr('style')).border || '';

                    if (border) {
                        w = border.match(/(\d(px|em|%))/);
                        c = border.match(/(#[a-z0-9]+)/);
                        val = {
                            width : w ? w[1] : border,
                            style : border,
                            color : rte.utils.color2Hex(c ? c[1] : border)
                        };
                    }
                } else if (n == 'align') {
                    val = img.css('float');

                    if (val != 'left' && val != 'right') {
                        val = img.css('vertical-align');
                    }
                 }else {
                    val = img.attr(n)||'';
                }

                el.val(val);
            });
        };

    this.img     = null;

    this.init = function() {
        this.src = {
            src    : $('<input type="text" />'),
            file   : $('<input name="file" type="file" />'),
            title  : $('<input type="text" />'),
            alt    : $('<input type="text" />'),
            width  : $('<input type="text" />').css('min-width', '50px').css('text-align', 'right'),
            height : $('<input type="text" />').css('min-width', '50px').css('text-align', 'right'),
            align  : $('<select />')
                        .append($('<option />').val('').text(this.rte.i18n('Not set', 'dialogs')))
                        .append($('<option />').val('left'       ).text(this.rte.i18n('Left')))
                        .append($('<option />').val('right'      ).text(this.rte.i18n('Right')))
                        .append($('<option />').val('top'        ).text(this.rte.i18n('Top')))
                        .append($('<option />').val('text-top'   ).text(this.rte.i18n('Text top')))
                        .append($('<option />').val('middle'     ).text(this.rte.i18n('middle')))
                        .append($('<option />').val('baseline'   ).text(this.rte.i18n('Baseline')))
                        .append($('<option />').val('bottom'     ).text(this.rte.i18n('Bottom')))
                        .append($('<option />').val('text-bottom').text(this.rte.i18n('Text bottom'))),
            border : $('<div />').elBorderSelect({name : 'border'})
        };
    };

    this.command = function() {
        !this.src && this.init();

        var img;
        reset();
        img = rte.selection.getEnd();

        this.img = img.nodeName == 'IMG' && !$(img).is('.elrte-protected')
            ? $(img)
            : $('<img/>');

        bookmarks = rte.selection.getBookmark();
        var matches = document.cookie.match(new RegExp("(?:^|; )_csrf=([^;]*)"));
        var csrf = matches ? decodeURIComponent(matches[1]) : '';

        this.d = $('<div id="elrte-wa_image" class="fields form"></div>')
        .append(dialog_row(this.rte.i18n('Image'),[
                $("<label></label>")
                    .append('<input type="radio" name="source" value="url" checked /> ' + this.rte.i18n('URL') + ' ')
                    .append(this.src.src),
                $("<label></label>")
                    .append('<input type="radio" name="source" value="file" /> ' + this.rte.i18n('Upload') + ' ')
                    .append(this.src.file)
                    .append('<br /><span class="hint">' + ($_ ? $_('Image will be uploaded into') : this.rte.i18n('Image will be uploaded into')) + ' '+(rte.options.wa_image_upload_path?rte.options.wa_image_upload_path:'/wa-data/public/site/img/')+'</span>')]
                ))
        .append(dialog_row(this.rte.i18n('Title'), this.src.title))
        .append(dialog_row(this.rte.i18n('Alt text'), this.src.alt))
        .append(dialog_row(this.rte.i18n('Size'),
                $('<span />').append(this.src.width).append(' x ')
                             .append(this.src.height).append(' px')))
        .append(dialog_row(this.rte.i18n('Alignment'), this.src.align))
        .append(dialog_row(this.rte.i18n('Border'), this.src.border))
        .append('<input type="hidden" name="_csrf" value="' + csrf + '"/>')
        .waDialog({
            esc: true,
            width: '600px',
            height: '300px',
            'class': 'wa-elrte-dialog',
            title : this.rte.i18n('Image'),
            buttons: '<input type="submit" class="button green" value="' + this.rte.i18n('OK') + '"> ' + this.rte.i18n('or') + ' <a href="#" class="inline-link cancel"><b><i>' + this.rte.i18n('cancel') + '</i></b></a>',
            onClose: function () {
                self.bookmarks && self.rte.selection.moveToBookmark(self.bookmarks);
            },
            disableButtonsOnSubmit: true,
            onSubmit: function (d) {
                if (self.src.file.parents('div.value').find('input[name=source]:checked').val() == 'file') {
                    var f = self.src.src.parents('form');
                    var iframe = $('<iframe style="display:none" name="wa_image_upload_' + Math.random() + '"></iframe>');
                    iframe.insertAfter(f);
                    f.attr('enctype', 'multipart/form-data');
                    f.attr('target', iframe.attr('name'));
                    f.attr('action', rte.options.wa_image_upload);
                    iframe.one('load', function () {
                        var response = $.parseJSON($(this).contents().find('body').html());
                        if (response.status == 'ok') {
                            self.src.src.val(response.data);
                            self.src.height.val('');
                            self.src.width.val('');
                            self.set();
                            d.trigger('close');
                        } else if (response.status == 'fail') {
                            d.find("input[type=submit]").removeAttr('disabled');
                            alert(response.errors);
                        } else {
                            d.find("input[type=submit]").removeAttr('disabled');
                            alert('Unknown error');
                        }
                        $(this).remove();
                    });
                } else {
                    self.set();
                    d.trigger('close');
                    return false;
                }
            }
        });

        if (this.img.attr('src')) {
            values(this.img);
            proportion   = (this.img.width()/this.img.height()).toFixed(2);
            width        = parseInt(this.img.width());
            height       = parseInt(this.img.height());
        }
    };

    this.set = function() {
        var src = this.src.src.val(),
            link;

        this.rte.history.add();
        bookmarks && rte.selection.moveToBookmark(bookmarks);

        if (!src) {
            link = rte.dom.selfOrParentLink(this.img[0]);
            link && link.remove();
            return this.img.remove();
        }

        !this.img[0].parentNode && (this.img = $(this.rte.doc.createElement('img')));

        if (this.img.attr('src') != src) {
            this.img.attr('src', src);
            this.img.removeAttr('data-src');
        }

        $.each(this.src, function(name, el) {
            if (name == 'file') {
                return;
            }
            var val = el.val();

            switch (name) {
                case 'width':
                    self.img.css('width', val);
                    break;
                case 'height':
                    self.img.css('height', val);
                    break;
                case 'align':
                    self.img.css(val == 'left' || val == 'right' ? 'float' : 'vertical-align', val);
                    break;
                case 'border':
                    if (!val.width) {
                        val = '';
                    } else {
                        val = 'border:'+val.css+';'+$.trim((self.img.attr('style')||'').replace(/border\-[^;]+;?/ig, ''));
                        name = 'style';
                        self.img.attr('style', val);
                        return;
                    }

                    break;
                case 'src':
                    return;
                default:
                    val ? self.img.attr(name, val) : self.img.removeAttr(name);
            }
        });

        !this.img[0].parentNode && rte.selection.insertNode(this.img[0]);
        this.rte.ui.update();
    };

    this.update = function() {
        this.domElem.removeClass('disabled');
        var n = this.rte.selection.getEnd(),
            $n = $(n);
        if (n.nodeName == 'IMG' && !$n.hasClass('elrte-protected')) {
            this.domElem.addClass('active');
        } else {
            this.domElem.removeClass('active');
        }
    };
};

})(jQuery);;
/*
 * Russian translation
 * @author Dmitry Levashov <dio@std42.ru>
 * @version 2010-09-20
 */
(function($) {
elRTE.prototype.i18Messages.ru = {
	'_translator'    : 'Dmitry (dio) Levashov &lt;dio@std42.ru&gt;',
	'_translation'   : 'Русский перевод',
	'Editor' : 'Редактор',
	'Source' : 'Исходник',
	// названия панелей
	'Copy/Pase'      : 'Копирование/Вставка',
	'Undo/Redo'      : 'Отмена/Повтор действия',
	'Text styles'    : 'Стили текста',
	'Colors'         : 'Цвета',
	'Alignment'      : 'Выравнивание',
	'Indent/Outdent' : 'Отступы',
	'Text format'    : 'Форматирование',
	'Lists'          : 'Списки',
	'Misc elements'  : 'Разные элементы',
	'Links'          : 'Ссылки',
	'Images'         : 'Изображения',
	'Media'          : 'Media файлы',
	'Tables'         : 'Таблицы',
	'File manager (elFinder)' : 'Файловый менеджер (elFinder)',
	// названия кнопок
	'About this software'     : 'О программе',
	'Save'                    : 'Сохранить',
	'Copy'                    : 'Копировать',
	'Cut'                     : 'Вырезать',
	'Paste'                   : 'Вставить',
	'Paste only text'         : 'Вставить только текст',
	'Paste formatted text'    : 'Вставить форматированый текст',
	'Clean format'            : 'Удалить форматирование', 
	'Undo last action'        : 'Отменить действие',
	'Redo previous action'    : 'Повторить действие ',
	'Bold'                    : 'Жирный',
	'Italic'                  : 'Курсив',
	'Underline'               : 'Подчеркнутый',
	'Strikethrough'           : 'Перечеркнутый',
	'Superscript'             : 'Надстрочный текст',
	'Subscript'               : 'Подстрочный текст',
	'Align left'              : 'Выровнять налево',
	'Ailgn right'             : 'Выровнять направо',
	'Align center'            : 'Выровнять по центру',
	'Align full'              : 'Выровнять по краям',
	'Font color'              : 'Цвет шрифта',
	'Background color'        : 'Цвет заливки',
	'Indent'                  : 'Увеличить отступ',
	'Outdent'                 : 'Уменьшить отступ',
	'Format'                  : 'Форматирование',
	'Font size'               : 'Размер шрифта',
	'Font'                    : 'Шрифт',
	'Ordered list'            : 'Нумерованый список',
	'Unordered list'          : 'Ненумерованый список',
	'Horizontal rule'         : 'Горизонтальная линия',
	'Blockquote'              : 'Цитата',
	'Block element (DIV)'     : 'Блочный элемент (DIV)',
	'Link'                    : 'Ссылка',
	'Delete link'             : 'Удалить ссылку',
	'Bookmark'                : 'Закладка',
	'Image'                   : 'Изображение',
	'Table'                   : 'Таблица',
	'Delete table'            : 'Удалить таблицу',
	'Insert row before'       : 'Вставить ряд до',
	'Insert row after'        : 'Вставить ряд после',
	'Delete row'              : 'Удалить ряд',
	'Insert column before'    : 'Вставить колонку до',
	'Insert column after'     : 'Вставить колонку после',
	'Delete column'           : 'Удалить колонку',
	'Merge table cells'       : 'Склеить ячейки',
	'Split table cell'        : 'Разделить ячейку',
	'Toggle display document structure' : 'Показать структуру документа/невидимые элементы',
	'Table cell properties'   : 'Свойство ячейки',
	'Table properties'        : 'Свойство таблицы',
	'Toggle full screen mode' : 'Во весь экран',
	'Open file manager'       : 'Открыть файловый менеджер',
	'Non breakable space'     : 'Неразрывный пробел',
	'Stop element floating'   : 'Отключить обтекание элементов текстом',
	// dialogs
	'Warning' : 'Внимание',
	'Properies' : 'Свойства',
	'Popup' : 'Новое окно',
	'Advanced' : 'Дополнительно',
	'Events' : 'События',
	'Width' : 'Ширина',
	'Height' : 'Высота',
	'Left'   : 'Слева',
	'Center' : 'По центру',
	'Right'  : 'Справа',
	'Border' : 'Бордюр',
	'Background' : 'Фон',
	'Css class' : 'Css класс',
	'Css style' : 'Css cтиль',
	'No' : 'Нет',
	'Title' : 'Заголовок',
	'Script direction' : 'Направление письма',
	'Language' : 'Язык',
	'Charset' : 'Кодировка',
	'Not set' : 'Не установлено',
	'Left to right' : 'Слево направо',
	'Right to left' : 'Справа налево',
	'In this window' : 'В этом окне',
	'In new window (_blank)' : 'В новом окне (_blank)',
	'In new parent window (_parent)' : 'В родительском окне (_parent)',
	'In top frame (_top)' : 'В верхнем фрейме (_top)',
	'URL' : '',
	'Open in' : 'Открыть',
	'Open file manger' : 'Открыть файловый менеджер',
	// copy
	'This operation is disabled in your browser on security reason. Use shortcut instead.' : 'Действие запрещено в вашем браузере по соображениям безопастности. Используйте сочетание клавиш',
	// format 
	'Heading 1' : 'Заголовок 1',
	'Heading 2' : 'Заголовок 2',
	'Heading 3' : 'Заголовок 3',
	'Heading 4' : 'Заголовок 4',
	'Heading 5' : 'Заголовок 5',
	'Heading 6' : 'Заголовок 6',	
	'Paragraph' : 'Параграф',
	'Address' : 'Адрес',
	'Preformatted' : '',
	// font size
	'Small (8pt)'   : 'Мелкий (8pt)',
	'Small (10px)'  : 'Маленький (10px)',
	'Small (12pt)'  : 'Небольшой (12pt)',
	'Normal (14pt)' : 'Обычный (14pt)',
	'Large (18pt)'  : 'Большой (18pt)',
	'Large (24pt)'  : 'Крупный (24pt)',
	'Large (36pt)'  : 'Огромный (36pt)',				
	// bookmark
	'Bookmark name' : 'Имя закладки',
	// link
	'Link URL' : 'Адрес ссылки (URL)',
	'Target' : 'Цель',
	'Select bookmark' : 'Выбрать закладку',
	'Open link in popup window' : 'Открыть ссылку во всплывающем окне',
	'URL' : '',
	'Window name' : 'Название окна',
	'Window size' : 'Размер окна',
	'Window position' : 'Позиция окна',
	'Location bar' : 'Панель локации',
	'Menu bar' : 'Панель меню',
	'Toolbar' : 'Панель инструментов',
	'Scrollbars' : 'Полосы прокрутки',
	'Status bar' : 'Строка состояния',
	'Resizable' : 'Изменение размера',
	'Depedent' : 'Зависимый (Netscape)',
	'Add return false' : 'Добавить (return false)',
	'Target MIME type' : 'MIME type цели',
	'Relationship page to target (rel)' : 'Отношение страницы к цели (rel)',
	'Relationship target to page (rev)' : 'Отношение цели к странице (rev)',
	'Tab index' : '',
	'Access key' : 'Клавиша доступа',
	// image
	'Size' : 'Размер',
	'Preview' : 'Предварительный просмотр',
	'Margins' : 'Отступы',
	'Alt text' : 'Описание (Alt)',
	'Image URL' : 'URL',
	// table
	'Spacing'       : 'Промежуток (spacing)',
	'Padding'       : 'Отступ (padding)',
	'Rows'          : 'Строки',
	'Columns'       : 'Колонки',
	'Groups'        : 'Группы',
	'Cells'         : 'Ячейки',
	'Caption'       : 'Заголовок таблицы',
	'Inner borders' : 'Внутренний бордюр',
	// table cell
	'Table cell type' : 'Тип ячейки',
	'Data' : 'Данные',
	'Header' : 'Заголовок',
	'Justify' : 'По краям',
	'Paddings' : 'Отступы',
	'Apply to' : 'Применить к',
	'Current cell' : 'Выбранная ячейка',
	'All cells in row' : 'Все ячейки в ряду',
	'All cells in column' : 'Все ячейки в столбце',
	'All cells in table' : 'Все ячейки таблицы',
	// about
	'About elRTE' : 'О редакторе elRTE',
	'Version' : 'Версия',
	'Licence' : 'Лицензия',
	'elRTE is an open-source JavaScript based WYSIWYG HTML-editor.' : 'elRTE - это свободный WYSIWYG редактор для сайтов и систем управления контентом (CMS), написанный на JavaScript.',
	'Main goal of the editor - simplify work with text and formating (HTML) on sites, blogs, forums and other online services.' : 'Основная цель редактора - максимально упростить работу с текстом и разметкой (HTML) на сайтах, блогах, форумах и прочих online сервисах.',
	'You can use it in any commercial or non-commercial projects.' : 'Вы можете использовать его в любых коммерческих и некоммерческих проектах.',
	'Authors' : 'Авторы',
	'Chief developer' : 'Ведущий разработчик',
	'Developer, tech support' : 'Разработчик, техническая поддержка',
	'Developer' : 'Разработчик',
	'Interface designer' : 'Дизайнер интерфейса',
	'Spanish localization' : 'Испанская локализация',
	'Czech localization' : 'Чешская локализация',
	'Japanese localization' : 'Японская локализация',
	'Latvian localization' : 'Латышская локализация',
	'German localization' : 'Немецкая локализация',
	'Ukranian localization' : 'Украинская локализация',
	'Persian (farsi) localization' : 'Персидская (фарси) локализация',
	'Arabic localization' : 'Арабская локализация',
	'RTL support' : 'Поддержка RTL',
	'French localization' : 'Французская локализация',
	'Dutch localization' : 'Голландская локализация',
	'Hungarian localization' : 'Венгерская локализация',
	'Polish localization' : 'Польская локализация',
	'Italian localization' : 'Итальянская локализация',
	'Traditional Chinese localization' : 'Китайская (традиционная) локализация',
	'For more information about this software visit the' : 'Подробная информация и форум тех. поддержки',
	'elRTE website' : 'на сайте elRTE',
	'or': 'или',
	'cancel': 'отмена',
	'Upload': 'Загрузить',
	'Image will be uploaded into' : 'Изображение будет загружено в'
	
}
})(jQuery);
;
(function($) {
	elRTE.prototype.options.panels.wa_split_vertical = ['wa_split_vertical'];

	elRTE.prototype.options.buttons['wa_split_vertical'] = $_('Split vertical');
	elRTE.prototype.ui.prototype.buttons.wa_split_vertical = function(rte, name) {
		this.constructor.prototype.constructor.call(this, rte, name);
		var id = 'elrte-wa_split_vertical';

		try {
			this.wa_split_vertical_text_default = $.wa_blog.editor.options.cut_link_label_defaul;
		} catch (e) {
			this.wa_split_vertical_text_default = $_('Continue reading →');
		}

		this.update = function() {
			var hr = $('#' + id, rte.doc);
			if (hr.length) {
				if (!hr.text()) {
					hr.text(this.wa_split_vertical_text_default);
				}
			}
		};

		this.command = function() {
			this.rte.history.add();
			var html = '<span class="b-elrte-wa-split-vertical" id="' + id
					+ '">' + this.wa_split_vertical_text_default + '</span>';
			this.rte.selection.insertHtml(html);
		};
	};
})(jQuery);;
