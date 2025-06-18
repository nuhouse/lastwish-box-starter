import React from "react";
import { NavLink } from "react-router-dom";

const Sidebar = ({ features }) => (
  <nav className="sidebar">
    {features.map(f => (
      <NavLink
        key={f.path}
        to={`/${f.path}`}
        className={({ isActive }) => "menu-link" + (isActive ? " active" : "")}
        end
      >
        {f.label}
      </NavLink>
    ))}
  </nav>
);

export default Sidebar;
