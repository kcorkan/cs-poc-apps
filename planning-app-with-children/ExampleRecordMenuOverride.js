Ext.override(Rally.ui.menu.DefaultRecordMenu, {
    //Override the getMenuItems function to return only the menu items that we are interested in.
    onSuccess: Ext.emptyFn,
    onError: Ext.emptyFn,
    _getMenuItems: function() {
        var record = this.getRecord(),
            items = [],
            popoverPlacement = this.popoverPlacement || Rally.ui.popover.Popover.DEFAULT_PLACEMENT;
        //console.log("teamdata",this.teamData,"teamFields",this.teamFields,"subFeatureModel",this.subFeatureModel);
        items.push({
            xtype: 'examplerecordmenuitem',
            view: this.view,
            record: record,
            text: "Add HomeBuildingBlock",
            teamData: this.teamData,
            teamFields: this.teamFields,
            subFeatureModel: this.subFeatureModel,
            showHomeTeam: "Home",
            onSuccess: this.onSuccess,
            onError: this.onError
        });
        items.push({
            xtype: 'examplerecordmenuitem',
            view: this.view,
            record: record,
            text: "Add VisitorBuildingBlock",
            teamData: this.teamData,
            teamFields: this.teamFields,
            subFeatureModel: this.subFeatureModel,
            showHomeTeam: "Visitor",
            onSuccess: this.onSuccess,
            onError: this.onError
        });
        return items;
    }
});
