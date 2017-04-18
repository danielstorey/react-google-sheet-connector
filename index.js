var React = require("react");
var createReactClass = require("create-react-class");
var GoogleSheetConnector = require("google-sheet-connector");
var googleSheet;

/* Components */

var ReactGoogleSheetConnector = createReactClass({
    getInitialState: function() {
        return {
            isFetching: true,
        };
    },

    shouldComponentUpdate: function(props, state) {
        return !state.isFetching;
    },

    componentDidMount: function() {
        googleSheet = new GoogleSheetConnector({
            apiKey: this.props.apiKey,
            clientId: this.props.clientId,
            spreadsheetId: this.props.spreadsheetId
        }, function() {
            this.setState({isFetching: false});
        }.bind(this));
    },

    render: function() {
        return this.state.isFetching ?
            this.props.spinner || React.createElement("div", null, "Loading") :
            this.props.children || null;
    }
});

var GoogleRoute = function(props) {
    return React.createElement(GoogleSheet, props.route);
};

var GoogleSheet = function(props) {
    var sheetData = googleSheet.getSheet(props.sheetName);

    if (props.filter) sheetData.filter(props.filter);
    if (props.group) sheetData.group(props.group);
    if (props.sort) sheetData.sort(props.sort);

    var newProps = {data: sheetData.getCurrentData()};
    for (var i in props) {
        newProps[i] = props[i]
    }
    return React.createElement(props.child, newProps);
};

var GoogleTable = function(props) {
    var sheetData = googleSheet.getSheet(props.sheetName);
    var rows = [];

    if (props.filter) {
        sheetData.filter(props.filter);
    }

    if (props.hasHeader !== false) {
        rows.push(renderTableRow(sheetData.header, "h", true));
    }

    rows = rows.concat(sheetData.getCurrentData().map(renderTableRow));

    return React.createElement("table", {id: props.id, className: props.className},
        React.createElement("tbody", null, rows)
    );
};

function renderTableRow(row, key, isHeader) {
    var tag = isHeader === true ? "th" : "td";

    return React.createElement("tr", {key: "r" + key}, row.map(function(value, i) {
            return React.createElement(tag, {key: "c" + i}, value);
        })
    );
}

var connectToSpreadsheet = function(component) {
    return function(props) {
        var newProps = {
            getSheet: function(sheetName) {
                return googleSheet.getSheet(sheetName);
            }
        };

        for (var i in props) {
            newProps[i] = props[i];
        }

        return React.createElement(component, newProps);
    };
};

module.exports = ReactGoogleSheetConnector;
module.exports.GoogleSheet = GoogleSheet;
module.exports.GoogleRoute = GoogleRoute;
module.exports.GoogleTable = GoogleTable;
module.exports.connectToSpreadsheet = connectToSpreadsheet;