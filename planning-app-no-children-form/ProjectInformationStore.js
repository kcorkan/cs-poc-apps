Ext.define('ProjectInformationStore',{
    buildingBlockField: 'c_BuildingBlock',
    constructor: function(config){
        this.projectHashByObjectID = this.buildHashByField(config.projectRecords, 'ObjectID');
    },
    /**
     * getPinRecordForProject
     * @param projectObjectID
     * @returns {the project record that represents the ancestor PIN for the passed project Object ID}
     * A project is determined as a PIN by it's naming as a "Technology Area: *".  If there are multiple
     * project name matches in the passed project's hierarchy, then the highest level match is return.
     */
    getPinRecordForProject: function(projectObjectID, hash){
        var projectHashByObjectID = hash || this.projectHashByObjectID,
            rec = projectHashByObjectID[projectObjectID];

        if (!rec){
            console.log('null', projectObjectID, this.projectHashByObjectID);
            return null;
        }

        if (rec.get('__pin')){
            return projectHashByObjectID[rec.get('__pin')];
        }

        var path = rec.get('__path') || this.getProjectPath(rec, projectHashByObjectID),
            pinRecord = null,
            pinRegExp = new RegExp("^TECHNOLOGY AREA:","i");

        Ext.Array.each(path, function(p){
            if (pinRegExp.test(projectHashByObjectID[p].get('Name'))){
                pinRecord = projectHashByObjectID[p];
                return false;
            }
        });
        if (pinRecord){
            rec.set('__pin', pinRecord.get('ObjectID'));
        }
        return pinRecord;
    },
    /**
     * getTeamSprintCapacity:  calculates the team sprint capacity for the passed project.
     * For the POC we are just pulling this from a custom field.
     * Other approaches discussed were to count the leaf projects inside of a pin and multiply those
     * by a number
     */
    getTeamSprintCapacity: function(projectOid, quarters){
        return this.getPinRecordForProject(projectOid).get('c_Capacity');
    },
    buildHashByField: function(records, field){
        var hash = {};
        console.log('buildHashByField', records);
        Ext.Array.each(records, function(record){
            hash[record.get(field)] = record;
        }, this);
        this.projectHashByObjectID = hash;

        Ext.Object.each(hash, function(key, record){
            record.set('__path', this.getProjectPath(record, hash));
        }, this);

        return hash;
    },
    /**
     * getProjectPath
     * @param projectRecord
     * @param projectHashByObjectID
     * @returns {*[]} returns an array of project ObjectIDs that represent the hierarchy path for the passed projectRecord
     */
    getProjectPath: function(projectRecord, projectHashByObjectID){
        var parent = projectRecord.get('Parent') && projectRecord.get('Parent').ObjectID,
            path = [projectRecord.get('ObjectID')];

        while (parent){
            var parentRecord = projectHashByObjectID[parent];
            if (parentRecord){
                path.unshift(projectHashByObjectID[parent].get('ObjectID'));
                parent = parentRecord.get('Parent') && parentRecord.get('Parent').ObjectID;
            } else {
                parent = null;
            }
        }
        return path;
    },
    getBuildingBlockOptions: function(projectObjectID, useHomeTeam, hash){

        var homePin = this.getPinRecordForProject(projectObjectID).get('ObjectID'),
            buildingBlockField = this.buildingBlockField;

        if (!hash){
            hash = this.projectHashByObjectID;
        }

        var optionsHash = {};
        Ext.Object.each(hash, function(key, obj){
            var pin = this.getPinRecordForProject(obj.get('ObjectID'), hash) &&
                this.getPinRecordForProject(obj.get('ObjectID'), hash).get('ObjectID'),
                bb = obj.get(buildingBlockField);
            console.log('pin',pin,bb);
            if (bb && pin && ((pin === homePin) === useHomeTeam)){
                if (!optionsHash[pin]){
                    optionsHash[pin] = [];
                }
                if (!Ext.Array.contains(optionsHash[pin], bb)){
                    optionsHash[pin].push(bb);
                }
            }
        }, this);

        var data = [];
        Ext.Object.each(optionsHash, function(key, opt){
            Ext.Array.each(opt, function(bb){
                var name = hash[key].get('Name');
                console.log('jey',key,hash[key],name);
                data.push({
                    pin: key,
                    pinName: name,
                    buildingBlock: bb
                });
            });
        });
        console.log('data',data, optionsHash);
        return data;
    }
});
