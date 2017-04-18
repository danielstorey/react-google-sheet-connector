# react-google-sheet-connector
Load data from a Google spreadsheet into your react components

## Installation
`npm install --save react-google-sheet-connector`

## Overview
Firstly the data must be initialized by using the `<ReactGoogleSheetConnector>` component. You then have the `<GoogleSheet>`, `<GoogleRoute>` and `<GoogleTable>` components at your disposal as well as the highly versatile `connectToSpreadsheet` helper. 

## Initialization
Initialise the data like so:
You may use either `apiKey` or `clientId`. Please note that for data to be accessible using just the API Key the spreadsheet sharing must be set so that anyone with the link can view.
```jsx harmony
import ReactGoogleSheetConnector from "react-google-sheet-connector"

<ReactGoogleSheetConnector clientid={YOUR_CLIENT_ID}
    apiKey={YOUR_API_KEY}
    spreadsheetId={YOUR_SPREADSHEET_ID}
    spinner={ <div className="loading-spinner"/> } >
    <div>
    	This content will be rendered once the data has been fetched from the spreadsheet.
    </div>
</ReactGoogleSheetConnector>
```

### connectToSpreadsheet
The following example shows how to connect a component to the Spreadsheet. The component should be passed as an argument into the `connectToSpreadsheet` function included in this module.
```jsx harmony
import { connectToSpreadsheet } from "react-google-sheet-connector"

const MyComponent = (props) => {
    return (
        <div>
            {
                props.getSheet("Sheet Name")
                    .map((row, i) =>
                        JSON.stringify(row)
                    )
            }        
        </div>
    )
}

export default connectToSpreadsheet(MyComponent) 
```
This exposes the `getSheet` method to the component's props. `getSheet` takes one argument which is the name of the sheet and return an instance of `SheetData`.

## SheetData
This is the object that is used to operate on and render data. `SheetData` contains methods to help you process and render the data. These methods are as follows:

* #### filter
This method takes a single object as an argument. The keys should be the camel-case names of the column title and the values should be the respective values of those columns. For example, to get the rows where the "Item Category" column is equal to "Sports & Leisure":

`.filter({itemCategory: "Sports & Leisure"})`

This method returns the `SheetsData` instance for chaining.

* #### group
This method accepts one argument which is the title of the column you wish to group the data by. When grouped the data is split into an array of objects containing `name` and `values` properties. The `name` is the value for that particular group and the `values` the corresponding rows. E.g.

`.group("Item Category")`

This method returns the `SheetsData` instance for chaining.

* #### sort
This method accept one argument which is the title of the column you with to sort the data by. If your data has already been grouped then each group's `values` will be sorted by the specified column. E.g.

`.sort("Item Category")`

This method returns the `SheetData` instance for chaining.

* #### reverse
This method reverses the data and returns the `SheetData` instance.

* #### map
Use this as you would a regular array, once you have processed and are ready to render your data. Each row contains indexed values, as a regular array and also key-value pairs where the key is the column title converted to camelCase. 

* #### getData
This method returns an array of the original data rows from the sheet where each row contains indexed values and key-value pairs
 
* #### getCurrentData
This method returns the data after other methods e.g. `filter` and `group` have been applied.

### Method Chaining
Methods can be chained before finally rendering using `.map`. Here's an example:
```jsx harmony
props.getSheet("Sheet 1")
    .filter({inStock: "y"})
    .group("Product Type")
    .sort("Product Name")
    .reverse()
    .map((group, i) => 
        <div className="product-group" key={i}>
            <h2>{group.name}</h2>
            {
                group.values.map((row, j) =>
                    <div className="product-row" key={j}>
                )
            }
        </div>    
    )
```

## Components

### GoogleSheet
The `<GoogleSheet>` component injects data from the given sheet into the component specified as its `child` prop. You may also specify filter, group and sort props which work as described above.
```jsx harmony
import { GoogleSheet } from "react-google-sheet-connector"

<GoogleSheet child={ChildComponent} sheetName="My Sheet" filter={{key: "Value"}} group="Column Title" sort="Column to Sort">
```

### GoogleRoute
This component should be used as the `component` prop in a React Router `<Route>` component. By setting additional props on the component data will be passed from the specified sheet into the `child` component. In the example below data from the "Sheet 1" sheet will be passed into the props of `<ChildComponent>`. You may also use the filter, group and sort props as described above.
```jsx harmony
import { GoogleRoute } from "react-google-sheet-connector"

<Route path="/mypath" component={GoogleRoute} child={ChildComponent} sheetName="Sheet 1" />
```

### GoogleTable
This component renders a sheet from your Spreadsheet into an HTML table. As well as the props in the example below you may also assign `id` and `className` attributes to the component as well as `filter` as per the GoogleSheet example.
```jsx harmony
import { GoogleTable } from "react-google-sheet-connector"

<GoogleTable sheetName="Sheet 1" />
```
