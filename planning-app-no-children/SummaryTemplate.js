Ext.define('SummaryTemplate',{
    extend: 'Ext.XTemplate',
    constructor: function(config) {
        var templateConfig = [
            '<tpl><table>',
            '<thead>',
                '<th>Platform/PIN</th>',
                '<th>Quarter</th>',
                '<th>Team Sprint Capacity</th>',
            '</thead>',
            '<tr>',
                '<td>{Pin}</td>',
                '<td>{Quarter}</td>',
                '<td>{TeamSprintCapacity}</td>',
            '</tr>',
            '</table></tpl>'
        ];

        return this.callParent(templateConfig);

    }
});