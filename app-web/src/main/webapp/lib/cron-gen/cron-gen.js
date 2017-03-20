( function($) {

		var resultsName = "";
		var inputElement;

		$.fn.extend({
			cronGen : function() {

				inputElement = $(this);

				//create top menu
				_('CronContainer').remove();
				var cronContainer = inputElement.closest('.form-horizontal');
				var mainDiv = $("<div/>", {
					"class" : "form-group",
					id : "CronGenMainDiv"
				});
				var topMenu = $("<ul/>", {
					"class" : "nav nav-tabs",
					id : "CronGenTabs"
				});
				$('<li/>', {
					'class' : 'active'
				}).html($('<a id="DailyTab" href="#Daily">Daily</a>')).appendTo(topMenu);
				$('<li/>').html($('<a id="WeeklyTab" href="#Weekly">Weekly</a>')).appendTo(topMenu);
				$('<li/>').html($('<a id="MonthlyTab" href="#Monthly">Monthly</a>')).appendTo(topMenu);
				$('<li/>').html($('<a id="YearlyTab" href="#Yearly">Yearly</a>')).appendTo(topMenu);
				$(topMenu).appendTo(mainDiv);

				//create what's inside the tabs
				var container = $("<div/>", {
					"class" : "container-fluid",
					"style" : "margin-top: 10px"
				});
				var row = $("<div/>", {
					"class" : "row-fluid"
				});
				var span12 = $("<div/>", {
					"class" : "col-sm-12"
				});
				var tabContent = $("<div/>", {
					"class" : "tab-content"
				});

				//craeting the dailyTab
				var dailyTab = $("<div/>", {
					"class" : "tab-pane active",
					id : "Daily"
				});

				var dailyOption1 = $("<div/>", {
					"class" : "well well-small"
				});

				$(dailyOption1).append('<div class="radio"><label><input type="radio" name="DailyRadio" value="1">Every </label></div>');
				$(dailyOption1).find('label').append($("<input/>", {
					id : "DaysInput",
					type : "text",
					"class" : " form-control input-mini inline",
					value : "1"
				})).append("&nbsp;day(s)");
				$(dailyOption1).appendTo(dailyTab);

				var dailyOption2 = $("<div/>", {
					"class" : "well well-small"
				});
				$(dailyOption2).append('<div class="radio"><label><input type="radio" name="DailyRadio" value="2">Every week day</label></div>');
				$(dailyOption2).appendTo(dailyTab);

				$(dailyTab).append("Start time&nbsp;");
				$(dailyTab).append('<select id="DailyHours" class="hours form-control input-mini inline"></select>');
				$(dailyTab).append('<select id="DailyMinutes" class="minutes form-control input-mini inline"></select>');

				$(dailyTab).appendTo(tabContent);

				//creating the weeklyTab
				var weeklyTab = $("<div/>", {
					"class" : "tab-pane",
					id : "Weekly"
				});
				var weeklyWell = $("<div/>", {
					"class" : "well well-small"
				});

				var span31 = $("<div/>", {
					"class" : "col-sm-6"
				});
				$("<input/>", {
					type : "checkbox",
					value : "MON"
				}).appendTo(span31);
				$(span31).append("&nbsp;Monday<br />");
				$("<input/>", {
					type : "checkbox",
					value : "WED"
				}).appendTo(span31);
				$(span31).append("&nbsp;Wednesday<br />");
				$("<input/>", {
					type : "checkbox",
					value : "FRI"
				}).appendTo(span31);
				$(span31).append("&nbsp;Friday<br />");
				$("<input/>", {
					type : "checkbox",
					value : "SUN"
				}).appendTo(span31);
				$(span31).append("&nbsp;Sunday");

				var span32 = $("<div/>", {
					"class" : "col-sm-6"
				});
				$("<input/>", {
					type : "checkbox",
					value : "TUE"
				}).appendTo(span32);
				$(span32).append("&nbsp;Tuesday<br />");
				$("<input/>", {
					type : "checkbox",
					value : "THU"
				}).appendTo(span32);
				$(span32).append("&nbsp;Thursday<br />");
				$("<input/>", {
					type : "checkbox",
					value : "SAT"
				}).appendTo(span32);
				$(span32).append("&nbsp;Saturday");

				$(span31).appendTo(weeklyWell);
				$(span32).appendTo(weeklyWell);
				//Hack to fix the well box
				$("<br /><br /><br /><br />").appendTo(weeklyWell);

				$(weeklyWell).appendTo(weeklyTab);

				$(weeklyTab).append("Start time&nbsp;");
				$(weeklyTab).append('<select id="WeeklyHours" class="hours form-control input-mini inline"></select>');
				$(weeklyTab).append('<select id="WeeklyMinutes" class="minutes form-control input-mini inline"></select>');

				$(weeklyTab).appendTo(tabContent);

				//creating the monthlyTab
				var monthlyTab = $("<div/>", {
					"class" : "tab-pane",
					id : "Monthly"
				});

				var monthlyOption1 = $("<div/>", {
					"class" : "well well-small"
				});
				$("<input/>", {
					type : "radio",
					value : "1",
					name : "MonthlyRadio"
				}).appendTo(monthlyOption1);
				$(monthlyOption1).append("&nbsp;Day&nbsp");
				$("<input/>", {
					id : "DayOfMOnthInput",
					type : "text",
					value : "1",
					"class" : "form-control input-mini inline"
				}).appendTo(monthlyOption1);
				$(monthlyOption1).append("&nbsp;of every&nbsp;");
				$("<input/>", {
					id : "MonthInput",
					type : "text",
					value : "1",
					"class" : " form-control input-mini inline"
				}).appendTo(monthlyOption1);
				$(monthlyOption1).append("&nbsp;month(s)");
				$(monthlyOption1).appendTo(monthlyTab);

				var monthlyOption2 = $("<div/>", {
					"class" : "well well-small"
				});
				$("<input/>", {
					type : "radio",
					value : "2",
					name : "MonthlyRadio"
				}).appendTo(monthlyOption2);
				$(monthlyOption2).append("&nbsp;");
				$(monthlyOption2).append('<select id="WeekDay" class="day-order-in-month form-control input-small inline"></select>');
				$(monthlyOption2).append('<select id="DayInWeekOrder" class="week-days form-control input-medium inline"></select>');
				$(monthlyOption2).append("&nbsp;of every&nbsp;");
				$("<input/>", {
					id : "EveryMonthInput",
					type : "text",
					value : "1",
					"class" : "form-control input-mini inline"
				}).appendTo(monthlyOption2);
				$(monthlyOption2).append("&nbsp;month(s)");
				$(monthlyOption2).appendTo(monthlyTab);

				$(monthlyTab).append("Start time&nbsp;");
				$(monthlyTab).append('<select id="MonthlyHours" class="hours form-control input-mini inline"></select>');
				$(monthlyTab).append('<select id="MonthlyMinutes" class="minutes form-control input-mini inline"></select>');

				$(monthlyTab).appendTo(tabContent);

				//craeting the yearlyTab
				var yearlyTab = $("<div/>", {
					"class" : "tab-pane",
					id : "Yearly"
				});

				var yearlyOption1 = $("<div/>", {
					"class" : "well well-small"
				});

				$(yearlyOption1).append('<div class="radio"><label><input type="radio" name="YearlyRadio" value="1">Every </label></div>');
				$(yearlyOption1).find('label').append('<select id="MonthsOfYear" class="months form-control input-medium inline"></select>').append("&nbsp;in day&nbsp;").append($("<input/>", {
					id : "YearInput",
					type : "text",
					value : "1",
					"class" : "form-control input-mini inline"
				}));
				$(yearlyOption1).appendTo(yearlyTab);

				var yearlyOption2 = $("<div/>", {
					"class" : "well well-small"
				});
				$(yearlyOption2).append('<div class="radio"><label><input type="radio" name="YearlyRadio" value="2">The </label></div>');
				$(yearlyOption2).find('label').append('<select id="DayOrderInYear" class="day-order-in-month form-control input-small inline"></select>').append('<select id="DayWeekForYear" class="week-days form-control input-medium inline"></select>').append("&nbsp;of&nbsp;").append('<select id="MonthsOfYear2" class="months form-control input-medium inline"></select>');
				$(yearlyOption2).appendTo(yearlyTab);

				$(yearlyTab).append("Start time&nbsp;");
				$(yearlyTab).append('<select id="YearlyHours" class="hours form-control input-mini inline"></select>');
				$(yearlyTab).append('<select id="YearlyMinutes" class="minutes form-control input-mini inline"></select>');

				$(yearlyTab).appendTo(tabContent);
				$(tabContent).appendTo(span12);

				//creating the button and results input
				resultsName = $(this).prop("id");
				$(this).prop("name", resultsName);

				$(span12).appendTo(row);
				$(row).appendTo(container);
				$(container).appendTo(mainDiv);
				$(cronContainer).append(mainDiv);

				fillDataOfMinutesAndHoursSelectOptions();
				fillDayWeekInMonth();
				fillInWeekDays();
				fillInMonths();
				$('#CronGenTabs a').click(function(e) {
					e.preventDefault();
					$(this).tab('show');
				});
				$("#CronGenMainDiv select, #CronGenMainDiv input").change(function(e) {
					generate();
				});
				return;
			}
		});

		var fillInMonths = function() {
			var days = [{
				text : "January",
				val : "1"
			}, {
				text : "February",
				val : "2"
			}, {
				text : "March",
				val : "3"
			}, {
				text : "April",
				val : "4"
			}, {
				text : "May",
				val : "5"
			}, {
				text : "June",
				val : "6"
			}, {
				text : "July",
				val : "7"
			}, {
				text : "August",
				val : "8"
			}, {
				text : "September",
				val : "9"
			}, {
				text : "October",
				val : "10"
			}, {
				text : "Novermber",
				val : "11"
			}, {
				text : "December",
				val : "12"
			}];
			$(".months").each(function() {
				fillOptions(this, days);
			});
		};

		var fillOptions = function(elements, options) {
			var i;
			for ( i = 0; i < options.length; i++) {
				$(elements).append("<option value='" + options[i].val + "'>" + options[i].text + "</option>");
			}
		};
		var fillDataOfMinutesAndHoursSelectOptions = function() {
			var i;
			for ( i = 0; i < 60; i++) {
				if (i < 24) {
					$(".hours").each(function() {
						$(this).append(timeSelectOption(i));
					});
				}
				$(".minutes").each(function() {
					$(this).append(timeSelectOption(i));
				});
			}
		};
		var fillInWeekDays = function() {
			var days = [{
				text : "Monday",
				val : "MON"
			}, {
				text : "Tuesday",
				val : "TUE"
			}, {
				text : "Wednesday",
				val : "WED"
			}, {
				text : "Thursday",
				val : "THU"
			}, {
				text : "Friday",
				val : "FRI"
			}, {
				text : "Saturday",
				val : "SAT"
			}, {
				text : "Sunday",
				val : "SUN"
			}];
			$(".week-days").each(function() {
				fillOptions(this, days);
			});

		};
		var fillDayWeekInMonth = function() {
			var days = [{
				text : "First",
				val : "1"
			}, {
				text : "Second",
				val : "2"
			}, {
				text : "Third",
				val : "3"
			}, {
				text : "Fourth",
				val : "4"
			}];
			$(".day-order-in-month").each(function() {
				fillOptions(this, days);
			});
		};
		var displayTimeUnit = function(unit) {
			if (unit.toString().length === 1) {
				return "0" + unit;
			}
			return unit;
		};
		var timeSelectOption = function(i) {
			return "<option id='" + i + "'>" + displayTimeUnit(i) + "</option>";
		};

		var generate = function() {

			var activeTab = $("ul#CronGenTabs li.active a").prop("id");
			var results = "";
			switch (activeTab) {
			case "DailyTab":
				switch ($("input:radio[name=DailyRadio]:checked").val()) {
				case "1":
					results = "0 " + Number($("#DailyMinutes").val()) + " " + Number($("#DailyHours").val()) + " 1/" + $("#DaysInput").val() + " * ? *";
					break;
				case "2":
					results = "0 " + Number($("#DailyMinutes").val()) + " " + Number($("#DailyHours").val()) + " ? * MON-FRI *";
					break;
				}
				break;
			case "WeeklyTab":
				var selectedDays = "";
				$("#Weekly input:checkbox:checked").each(function() {
					selectedDays += $(this).val() + ",";
				});
				if (selectedDays.length > 0) {
					selectedDays = selectedDays.substr(0, selectedDays.length - 1);
				}
				results = "0 " + Number($("#WeeklyMinutes").val()) + " " + Number($("#WeeklyHours").val()) + " ? * " + selectedDays + " *";
				break;
			case "MonthlyTab":
				switch ($("input:radio[name=MonthlyRadio]:checked").val()) {
				case "1":
					results = "0 " + Number($("#MonthlyMinutes").val()) + " " + Number($("#MonthlyHours").val()) + " " + $("#DayOfMOnthInput").val() + " 1/" + $("#MonthInput").val() + " ? *";
					break;
				case "2":
					results = "0 " + Number($("#MonthlyMinutes").val()) + " " + Number($("#MonthlyHours").val()) + " ? 1/" + Number($("#EveryMonthInput").val()) + " " + $("#DayInWeekOrder").val() + "#" + $("#WeekDay").val() + " *";
					break;
				}
				break;
			case "YearlyTab":
				switch ($("input:radio[name=YearlyRadio]:checked").val()) {
				case "1":
					results = "0 " + Number($("#YearlyMinutes").val()) + " " + Number($("#YearlyHours").val()) + " " + $("#YearInput").val() + " " + $("#MonthsOfYear").val() + " ? *";
					break;
				case "2":
					results = "0 " + Number($("#YearlyMinutes").val()) + " " + Number($("#YearlyHours").val()) + " ? " + $("#MonthsOfYear2").val() + " " + $("#DayWeekForYear").val() + "#" + $("#DayOrderInYear").val() + " *";
					break;
				}
				break;
			}

			// Update original control
			inputElement.val(results).change();
		};

	}(jQuery));

