Ext.define('SummaryTemplate',{
    extend: 'Ext.XTemplate',
    constructor: function(config) {
        var templateConfig = [
            '<tpl><table class="summary">',
            '<thead>',
                '<th class="summary">Platform/PIN</th>',
                '<th class="summary">Quarter</th>',
                '<th class="summary">Home Demand</th>',
                '<th class="summary">Team Sprint Capacity</th>',
                '<th class="summary">Visitor Demand</th>',
            '</thead>',
            '<tr>',
                '<td class="summary">{Pin}</td>',
                '<td class="summary">{Quarter}</td>',
                '<td class="summary">{HomeDemand}</td>',
                '<td class="summary">{TeamSprintCapacity}</td>',
                '<td class="summary">{VisitorDemand}</td>',
            '</tr>',
            '</table></tpl>'
        ];

        return this.callParent(templateConfig);

    }
});