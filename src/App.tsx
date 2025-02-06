import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import Spreadsheet from './Spreadsheet';

function App() {

  const data = [
    { name: 'John Doe', age: 28, city: 'New York', occupation: 'Engineer', salary: 70000 },
    { name: 'Jane Smith', age: 34, city: 'San Francisco', occupation: 'Designer', salary: 80000 },
    { name: 'Sam Johnson', age: 45, city: 'Chicago', occupation: 'Manager', salary: 90000 },
    { name: 'Alice Brown', age: 29, city: 'Los Angeles', occupation: 'Developer', salary: 75000 },
    { name: 'Bob White', age: 38, city: 'Seattle', occupation: 'Analyst', salary: 85000 },
    { name: 'Charlie Green', age: 50, city: 'Boston', occupation: 'Consultant', salary: 95000 }
  ];

  return (
    <>
      <h1 style={{color: "white"}}>Vite + React</h1>
      <div className="card">
        
      <div className="spreadsheet-container">
        <Spreadsheet 
        
        data={data} 
        columnHeaderTitle={(col)=>{
          if(col === 'name') return 'Name';
          if(col=== "city") return {
            title: "City",
            colSpan: 2
          }

          return col.toString()
        }}
        />
      </div>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  );
}

export default App
