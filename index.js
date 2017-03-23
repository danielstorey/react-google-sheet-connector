var React = require("react");
var fetch = require("isomorphic-fetch");
var camelCase = require("camelcase");
var gapi = require("./gapi");

var sheetsData = [];

/* Components */

var GoogleSheetConnector = React.createClass ({
    getInitialState: function() {
        return {
            isFetching: true,
            sheetsData: [],
            currSheet: 0
        };
    },

    loadSheetsData: function(data) {
        this.setState({numSheets: data.sheets.length});
        data.sheets.forEach(function(sheet) { return this.loadSheetViaKey(sheet.properties.title); }, this);
    },

    loadSheetViaAuth: function(sheet) {
        gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId: this.props.spreadsheetId,
            range: sheet.properties.title
        }).then(function(response) {
            var values = JSON.parse(response.body).values;
            this.loadSheet(sheet.properties.title, values);
        }.bind(this));
    },

    loadSheetViaKey: function(sheetName) {
        var url = [
            "https://sheets.googleapis.com/v4/spreadsheets/",
            this.props.spreadsheetId,
            "/values/",
            sheetName,
            "?key=",
            this.props.apiKey
        ].join("");

        fetch(url)
            .then(function(response) { return response.json(); })
            .then(function(json) {
                var values = json.values;
                this.loadSheet(sheetName, values);
            }.bind(this));
    },

    loadSheet: function(sheetName, values) {
        var headerRow = values[0];
        var dataRows = values.slice(1);
        var keys = headerRow.map(function(value) {
            return camelCase(value);
        }, this);

        sheetsData = sheetsData.concat({
            name: sheetName,
            header: headerRow,
            keys: keys,
            data: this.loadRowsData(keys, dataRows)
        });

        this.setState(function(prevState) {
            var currSheet = prevState.currSheet + 1;
            return {
                currSheet: currSheet,
                isFetching: currSheet < prevState.numSheets
            };
        });
    },

    loadRowsData: function(keys, values) {
        return values.map(function(row) {

            keys.forEach(function(key, i) {
                row[key] = row[i];
            });

            return row;
        });
    },

    initClient: function() {
        gapi.client.init({
            discoveryDocs: ["https://sheets.googleapis.com/$discovery/rest?version=v4"],
            clientId: this.props.clientId,
            scope: "https://www.googleapis.com/auth/spreadsheets.readonly"
        }).then(function () {

            gapi.client.sheets.spreadsheets.get({
                spreadsheetId: this.props.spreadsheetId
            }).then(function (response) {
                var sheets = JSON.parse(response.body).sheets;
                this.setState({numSheets: sheets.length});
                sheets.forEach(this.loadSheetViaAuth);
            }.bind(this));
        }.bind(this));
    },

    shouldComponentUpdate: function(props, state) {
        return !state.isFetching;
    },

    componentDidMount: function() {
        if (this.props.clientId) {
            return gapi.load("client:auth2", this.initClient);
        } else if (this.props.apiKey) {
            var url = [
                "https://sheets.googleapis.com/v4/spreadsheets/",
                this.props.spreadsheetId,
                "?key=",
                this.props.apiKey
            ].join("");

            fetch(url).then(function(response) { return response.json(); })
                .then(function(json) { return this.loadSheetsData(json); }.bind(this));
        }
    },

    render: function() {
        var msg = this.state.isFetching ? "Loading data from Spreadsheet" : "Data from Spreadsheet loaded successfully";
        console.info(msg);
        return this.state.isFetching ?
            this.props.spinner || React.createElement("div", null, "Loading") :
            React.cloneElement(this.props.children, sheetsData);
    }
});

var GoogleRoute = function(props) {
    console.log(props);
    return React.createElement(GoogleSheet, props.route);
};

var GoogleSheet = function(props) {
    var sheetData = new SheetData(props.sheetName);
    if (props.filter) sheetData.filter(props.filter);
    return React.createElement(props.child, {data: sheetData});
};

var GoogleTable = function(props) {
    var sheetData = new SheetData(props.sheetName);
    if (props.filter) sheetData.filter(props.filter);

    return sheetData.toTable({
        id: props.id,
        className: props.className,
        hasHeader: props.hasHeader
    });
};

var connectToSpreadsheet = function(component) {
    return function(props) {
        var newProps = {
            getSheet: function(sheetName) {
                return new SheetData(sheetName);
            }
        };

        for (var i in props) {
            newProps[i] = props[i];
        }

        return React.createElement(component, newProps);
    };
};

/* Helpers */

function SheetData(sheetName) {
    var sheet = sheetsData.find(function(sheet) { return sheet.name === sheetName; }) || {data: [], values: []};
    this.data = sheet.data;
    this.header = sheet.header;
    this.keys = sheet.keys;
    this.currentData = this.data.slice();
}

SheetData.prototype = {
    map: function(callback) {
        return this.currentData.map(callback);
    },
    filter: function(filterObj) {
        this.currentData = this.data.filter(function(row) {
            for (var i in filterObj) {
                if (!row.hasOwnProperty(i) || row[i] !== filterObj[i]) {
                    return false;
                }
            }

            return true;
        }, this);

        return this;
    },
    group: function(colName, sort) {
        var groups = [];
        var colIndex = this.header.indexOf(colName);

        if (colIndex === -1) return this;

        this.currentData.forEach(function(row) {
            var groupName = row[colIndex];
            var groupIndex = -1;

            groups.forEach(function(group, i) {
                if (group.name === groupName) groupIndex = i;
            });

            if (groupIndex > -1) {
                groups[groupIndex].data.push(row);
            } else {
                groups.push({
                    name: groupName,
                    data: [row]
                });
            }
        });

        if (sort) sortArray(groups, "name");

        this.currentData = groups;
        this.dataIsGrouped = true;

        return this;
    },
    sort: function(colName) {
        if (this.dataIsGrouped) {
            this.currentData.forEach(function(group) {
                sortArray(group.data, camelCase(colName));
            });
        } else {
            sortArray(this.currentData, camelCase(colName));
        }
        return this;
    },
    reverse: function() {
        this.currentData.reverse();
        return this;
    },
    toTable: function(options) {
        function renderTableRow(row, key, isHeader) {
            var tag = isHeader === true ? "th" : "td";

            return React.createElement("tr", {key: "r" + key}, row.map(function(value, i) {
                    return React.createElement(tag, {key: "c" + i}, value);
                })
            );
        }

        options = options || {};
        var rows = [];
        if (options.hasHeader !== false) rows.push(renderTableRow(this.header, "h", true));
        rows = rows.concat(this.currentData.map(renderTableRow));

        return React.createElement("table", {id: options.id, className: options.className},
            React.createElement("tbody", null, rows)
        );
    }
};

function sortArray(array, orderBy) {

    array.sort(function(a, b) {
        var textA = a[orderBy] ? a[orderBy].toUpperCase() : "";
        var textB = b[orderBy] ? b[orderBy].toUpperCase() : "";
        if (textA < textB) return -1;
        return textA > textB ? 1 : 0;
    });
}

module.exports = GoogleSheetConnector;
module.exports.GoogleSheet = GoogleSheet;
module.exports.GoogleRoute = GoogleRoute;
module.exports.GoogleTable = GoogleTable;
module.exports.connectToSpreadsheet = connectToSpreadsheet;