var billably = (function ($, angular) {
	var app = angular.module('billably', []);
	console.log("this is... working... right?");

	var daylist = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
	
	//#region Services

	app.service("dayheight", function () {

		var service = this;
		this.pixelQuarter = 16;
		this.pixelHour = this.pixelQuarter * 4;

		this.getHours = function (element) {
			var currentHeight = $(element).height();
			var ret = Math.round($(element).height() / this.pixelQuarter)/4;
			return ret;
		};

		this.setHours = function (element, hours) {
			$(element).height(hours * this.pixelHour);
		};

		this.watchHeight = function (before, after, scope) {
			var day,selector;
			
			service.seekHours.call(service,scope.hours,scope.locked,scope.targetHours);

			for(var i in daylist){
				selector = service.hoursElementSelector(daylist[i]);
				service.setHours(selector,scope.hours[daylist[i]]);
			}
		};

		this.seekHours = function(hours,locked,targetHours){

			var minKey,maxKey,selector,maxIteration = 0;
			
			while(targetHours > service.getTotal(hours)){
				minKey = service.getMin(hours,locked);
				if(locked[minKey]) break;
				hours[minKey] += 0.25;
				if(maxIteration++ > 100) break;
			}

			while(service.getTotal(hours) > targetHours){
				maxKey = service.getMax(hours,locked);
				if(locked[minKey]) break;
				hours[maxKey] -= 0.25;
				
				if(maxIteration++ > 100) break;
			}

			return {
				targetHours:targetHours,
				hours:hours,
				locked:locked
			};
		};

		this.hoursElementSelector = function(day){
			return ".hours[day="+day+"]";
		};

		this.snapToHeight = function (element) {
			var currentHeight = $(element).height();
			var newHeight = Math.round(currentHeight / this.pixelQuarter) * this.pixelQuarter;
			$(element).height(newHeight);
			return this;
		};

		this.getTotal = function(hours){
			hourValues = Object.values(hours);
			if(hourValues.length == 0){
				return 0;
			}
			return hourValues.reduce(function(sum,value){
				if(isNaN(value)) return sum;
				if(isNaN(sum)) return value;
				return sum+value;
			});
		};

		this.getMax = function(hours,locked){
			if(Object.keys(hours).length == 0) return 0;
			return Object.keys(hours).reduce(function(a,b){
				if(locked[b]) return a;
				if(locked[a]) return b;
				return hours[a] > hours[b] ? a : b;
			});
		};

		this.getMin = function(hours,locked){
			if(Object.keys(hours).length == 0) return 0;
			return Object.keys(hours).reduce(function(a,b){
				if(locked[b]) return a;
				if(locked[a]) return b;
				return hours[a] < hours[b] ? a : b;
			});
		};

		this.clearLocked = function(scope){
			for(var i = 0; i < 5; i++){
				scope.locked[daylist[i]] = false;
			}
			return {setLocked:setLocked.bind(scope)};
		};

		var setlocked = this.setLocked = function(day){
			this.locked[day] = true;
		};
	});

	app.factory("hoursHelper",function(){
		var HoursHelper = function(scope){
			this.scope = scope;
			this.ScopeNames = {
				target:"targetHours",
				efficiency:"efficiency"
			};
			this.midday = {
				hours: 13,
				minutes: 0,
				seconds: 0
			};	
		};

		HoursHelper.prototype = {
			setScope:function(scope){
				this.scope = scope;
				return this;
			},
			getScope:function(name){
				return this.scope[this.ScopeNames[name]];
			},
			getDayHours:function(){
				return Math.round(this.getWeekHours() / 5,2);
			},
			getWeekHours:function(){
				return Math.round(this.getScope("target") / this.getScope("efficiency"),2);
			},
			
			getArrivalTime:function(){
				var date = new Date();
				var diff = this._getDifference();
				console.log("Arrival Diff",diff);
				date.setHours(this.midday.hours - diff.hours);
				date.setMinutes(this.midday.minutes - diff.minutes);
				return this._formatTime(date);
			},
			getDepartureTime:function(){
				var date = new Date();
				var diff = this._getDifference();
				console.log("Departure Diff",{
					"midday hours":this.midday.hours,
					"diff hours":diff.hours,
					"setHours":this.midday.hours + diff.hours
				});
				date.setHours(this.midday.hours + diff.hours);
				date.setMinutes(this.midday.minutes + diff.minutes);
				return this._formatTime(date);
			},
			getReadableEfficiency:function(){
				return (this.getScope("efficiency")*100).toFixed(0)+"%";
			},
			_getDifference:function(){
				var daylength = this.getDayHours();
				var hours = parseInt((daylength / 2).toFixed(0));
				var minutes = parseInt(daylength / 2 % 1 * 60);
				return {hours:hours,minutes:minutes};
			},
			_formatTime:function(date){
				var sign = date.getHours() < 12 ? "AM":"PM";
				var hours = date.getHours() > 12 ? date.getHours() - 12: date.getHours();
				var minutes = ("0"+date.getMinutes()).slice(-2);
				return hours+":"+minutes+" "+sign;
			}
		};
		return HoursHelper;

	});
	
	//#endregion
	//#region Directives

	app.directive("hours", ["dayheight", function (dayheight) {
		var timeoutCancelKey = false;

		var link = function (scope, element, attrs, ngModel) {
			$(element).mousedown(function () {
				console.log("Mousedown Event hoursMouseDown method",hoursMousedown);
				hoursMousedown.call(this, scope);
			});

			if (!ngModel) return;

			ngModel.$render = function () {
				ngModelRender.call(this, scope);
			};
		};

		var hoursMousedown = function (scope) {
			var day = $(this).data("day");
			setLocked.call(scope,day);
			var element = this;
			$(window).one("mouseup", function () {
				hoursMouseUp(scope, element);
			});
		};

		var hoursMouseUp = function (scope, element) {
			var day = $(element).data("day");
			if (timeoutCancelKey) {
				clearTimeout(timeoutCancelKey);
			}
			scope.hours[day] = dayheight.snapToHeight(element).getHours(element);
			scope.$apply();
		};
		
		var clearLocked = dayheight.clearLocked;
		var setLocked = dayheight.setLocked;
		
		return {
			require: "?ngModel",
			link: link
		};
	}]);

	app.directive("slider",function(){
		console.log("Slider Directive");
		var link = function(scope,element,attrs){
			element.slider({
				value:scope[attrs.ngModel],
				min:parseFloat(attrs.min),
				max:parseFloat(attrs.max),
				step:parseFloat(attrs.step),
				slide:function(event,ui){
					scope.$apply(function(){
						scope[attrs.ngModel] = ui.value;
					});
				}
			});
		};

		return {
			restrict:"ECA",
			link:link
		};
	});
	//#endregion
	//#region Controller(s)
	app.controller('main', ['$scope', "dayheight","hoursHelper", function ($scope, dayheight,hoursHelper) {
		
		$scope.days = daylist;
		$scope.dayheight = dayheight;
		$scope.targetHours = 40;
		$scope.efficiency = 0.75;

		$scope.hours = setDefaultHours();
		$scope.locked = setDefaultLocked();
		$scope.hoursHelper = new hoursHelper($scope);

		$scope.clearLocked = function(){
			dayheight.clearLocked($scope);
		};

		$scope.lock = function(day){
			$scope.locked[day] = true;
		};


		$_ = $scope;
		
		$scope.$watch("hours",dayheight.watchHeight,true);
		$scope.$watch("targetHours",dayheight.watchHeight);
		
	}]);
	//#endregion
	//#region Helpers

	var setDefaultHours = function(hours){
		hours = {};
		for (var i = 0; i < 5; i++) {
			hours[daylist[i]] = 8;
		}
		hours[daylist[5]] = 0;
		hours[daylist[6]] = 0;
		return hours;
	};

	var setDefaultLocked = function(locked){
		locked = {};
		for(var day in daylist){
			locked[daylist[day]] = false;
		}
		locked[daylist[5]] = true;
		locked[daylist[6]] = true;
		return locked;
	};
	//#endregion

	return app;

})(jQuery, angular);
