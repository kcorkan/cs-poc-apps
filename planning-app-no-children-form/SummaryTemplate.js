Ext.define('SummaryTemplate',{
    extend: 'Ext.XTemplate',

    width: '100%',
    /**
     * @cfg {String}
     * define a height if necessary to fit where it's being used
     */
    height: '20px',

    constructor: function(config) {
        var templateConfig = [
            '<tpl><table class="summary">',
            '<thead>',
                '<th class="summary">Platform/PIN</th>',
                '<th class="summary">Quarter</th>',
                '<th class="summary">Home Demand</th>',
                '<th class="summary">Team Sprint Capacity</th>',
                '<th class="summary">Utilization</th>',
                '<th class="summary">Visitor Demand</th>',
            '</thead>',
            '<tpl for=".">',
            '<tr>',
                '<td class="summary">{Pin}</td>',
                '<td class="summary">{Quarter}</td>',
                '<td class="summary">{[this.getHomeDemand(values)]}</td>',
                '<td class="summary">{TeamSprintCapacity}</td>',
                '<td class="summary">',
            '<div class="progress-bar-container field-{[this.getPercentUtilization]}" style="{[this.getDimensionStyle()]}">',
            '<div class="rly-progress-bar" style="background-color: {[this.calculateColorFn(values)]}; width: {[this.calculateWidth(values)]}; "></div>',
            '<tpl if="this.showDangerNotificationFn(values)">',
            '<div class="progress-bar-danger-notification"></div>',
            '</tpl>',
            '<div class="progress-bar-label">',
            '{[this.generateLabelTextFn(values)]}',
            '</div>',
            '</div>',
                '</td>',
                '<td class="summary">{[this.getVisitorDemand(values)]}</td>',
            '</tr>',
            '</tpl>',
            '</table></tpl>',
            {
                calculateColorFn: function(recordData){
                    var percentDone = this.getPercentUtilization(recordData);
                    if (percentDone < 80) {
                        return Rally.util.Colors.lime;
                    } else if (recordData.percentDone <= 1) {
                        return Rally.util.Colors.yellow;
                    } else {
                        return Rally.util.Colors.red_med;
                    }
                },
                getVisitorDemand: function(recordData){
                    return (recordData.totalDemand - recordData.homeDemand) || '--';
                },
                getHomeDemand: function(recordData){
                    return (recordData.homeDemand || '--');
                },
                getPercentUtilization: function(recordData){
                    return recordData.totalDemand > 0 ? Math.round(recordData.homeDemand/recordData.TeamSprintCapacity * 100) : 0;
                },
                getDimensionStyle: function(){
                    return 'width: ' + this.width + '; height: ' + this.height + '; line-height: ' + this.height + ';display: inline-block';
                },
                calculateWidth: function (recordData) {
                    var percentDone = this.getPercentUtilization(recordData);
                    return percentDone > 100 ? '100%' : percentDone + '%';
                },
                generateLabelTextFn: function (recordData) {
                    return this.getPercentUtilization(recordData) + '%';
                }
            }
        ];

        return this.callParent(templateConfig);

    }
});