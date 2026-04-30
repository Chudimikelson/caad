import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { DataProvider, DataContext } from "./DataContext";
import { ThemeProvider } from "@mui/material/styles";
import createAppTheme from "./Theme";
import { useContext, useMemo } from "react";


import reportWebVitals from './reportWebVitals';

const AppWithTheme = () => {
  const { themeMode } = useContext(DataContext);
  const theme = useMemo(() => createAppTheme(themeMode), [themeMode]);

  return (
    <ThemeProvider theme={theme}>
      <App />
    </ThemeProvider>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <DataProvider>
    <AppWithTheme />
  </DataProvider>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
