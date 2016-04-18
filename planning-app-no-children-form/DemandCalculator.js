Ext.define('DemandCalculator',{
    constructor: function(config){
        this.records = config.records;
        this.homePin = config.homePin;
    },
    getHomeDemand: function(quarter){
        return this._getDemand(this.records, quarter, this.homePin);
    },
    getTotalDemand: function(quarter){
        return this._getDemand(this.records, quarter);
    },
    getVisitorDemand: function(quarter){
        return this.getTotalDemand(quarter) - this.getHomeDemand(quarter);
    },
    getHomeDemandFromVisitingTeams: function(quarter){
        //TODO: this is if we eventually want to visualize how much of the home capacity is being requested from Visiting teams
        return 0;
    },
    getHomeDemandFromHomeTeam: function(quarter){
        //TODO: this is if we eventually want to visualize how much of the home capacity is being requested from home teams
        return 0;
    },
    _getDemand: function(records, quarter, homePin){
        var demand = 0;
        Ext.Array.each(records, function(r){
            demand += r.getDemand(quarter,homePin); //If home pin is empty, then it will calculate the total demand
        });
        return demand;
    }
});