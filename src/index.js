import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { DataProvider } from "./DataContext";
import { ThemeProvider } from "@mui/material/styles";
import theme from "./Theme";


import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
<DataProvider>
      <ThemeProvider theme={theme}>
        <App />
      </ThemeProvider>
    </DataProvider>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
