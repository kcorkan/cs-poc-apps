Ext.define('ExampleRecordMenuItem', {
    extend: 'Rally.ui.menu.item.RecordMenuItem',
    alias: 'widget.examplerecordmenuitem',

    clickHideDelay: 1,

    config: {

        /**
         * @cfg {Rally.data.wsapi.Model}
         * The record of the menu
         */
        record: undefined,

        /**
         * @cfg {Function}
         * This is called when a menu item is clicked
         */
        handler: function () {
            var currentTeam=this.record.get('Project').ObjectID;
            console.log('click example record menu item',this.subFeatureModel,"currentTeam",currentTeam,"showHomeTeam",this.showHomeTeam);
            console.log("text",this.text);
            //var showHomeTeam=false;
            //if (/Home/.test(this.text)) {
            //    showHomeTeam=true;
            //}
            var dlg = Ext.create('Rally.ui.dialog.CustomChooserDialog',{
                teamFields: this.teamFields,
                showHomeTeam: this.showHomeTeam,
                currentTeam: currentTeam,
                teamData: this.teamData,
                listeners: {
                    scope: this,
                    itemchosen: function(dlg, selectedTeam){
                        console.log('team chosen', selectedTeam,this.subFeatureModel);
                        this.createSubFeatures(this.record,selectedTeam,this.subFeatureModel);
                    }
                }
            });
            dlg.show();
        },

        /**
         * @cfg {Function}
         *
         * A function that should return true if this menu item should show.
         * @param record {Rally.data.wsapi.Model}
         * @return {Boolean}
         */
        predicate: function (record) {
            return true;
        },

        /**
         * @cfg {String}
         * The display string
         */
        text: 'Example Record Menu Item...'

    },

    constructor:function (config) {
        this.initConfig(config);
        this.callParent(arguments);
    },
    createSubFeatures:function (record,teams,subfeatureModel) {
        console.log("createSubFeatures record",record,"teams",teams,"subfeatureModel",subfeatureModel);
        var promises=[];
        var me=this;
        Ext.Array.each(teams,function(team) {
            var newObject=Ext.create(subfeatureModel,{
                Name:record.get("Name")+": "+team.get("BuildingBlock"),
                c_ProjectType: record.get("c_ProjectType"),
                Parent: record.get('_ref'),
                Project:'/project/'+team.get('ObjectID')
            });

            promises.push(function() {
                return me._saveObject(newObject);
            });
        });
        Deft.Chain.sequence(promises).then({
            scope: this,
            success: this.onSuccess,
            failure: this.onError
        });


    },
    _saveObject: function(obj) {
        var deffered=Ext.create('Deft.Deferred');
        obj.save({
            callback:function(record,operation) {
                console.log("newObjectSaveCallback",record,operation);
                if (operation.wasSuccessful()) {
                    deffered.resolve(record);
                } else {
                    deffered.reject(operation);
                }
            }
        });
        return deffered.promise;
    }
});

