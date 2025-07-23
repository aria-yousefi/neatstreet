import {BsPlus, BsFillClipboard2Fill , BsFillMapFill,  BsFillPersonFill} from 'react-icons/bs';
import { Link } from 'react-router-dom';

const NavBar = () => {
    return (
        <div className = "fixed-top-0 justify-center w-screen h-16 m-0 flex flex-row bg-green-200 text-white shadow">
            <h1 className = "text-green-700 text-2xl font-titillium mt-3 mr-20">NeatStreet</h1>
            <Link to="/"><NavBarIcon icon={<BsPlus size="24" />} text="New Report" /></Link>
            <Link to="/user_reports"><NavBarIcon icon={<BsFillClipboard2Fill  size="24" />} text="My Reports" /></Link>
            <Link to="/reports_map"><NavBarIcon icon={<BsFillMapFill  size="24" />} text="Reports Map" /></Link>
        </div>
    );
};

const NavBarIcon = ({icon, text}) => (
    <div className = "navbar-icon group">
        {icon}
        <span class="navbar-tooltip group-hover:scale-100">{text}</span>
    </div>
);

export default NavBar;