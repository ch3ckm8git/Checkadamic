// import { Trophy } from "lucide-react";
// import React from "react";
// import logo from "../assets/imgs/ca_logo.png";

// export default function Header({ skips }) {
//     return (
//         <header className="bg-white rounded-3xl p-4 sm:p-6 shadow-md flex flex-col sm:flex-row items-center sm:justify-between mx-auto max-w-2xl">
//             <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-0">
//                 <img
//                     src={logo}
//                     alt="Checkadamic Logo"
//                     className="w-7 h-7 sm:w-8 sm:h-8"
//                 />
//                 <h1 className="text-xl sm:text-3xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-red-800 via-blue-900 to-red-500">
//                     Checkadamic
//                 </h1>
//             </div>
//             <div className="flex items-center gap-1 sm:gap-2 bg-blue-100 px-3 py-1 sm:px-4 sm:py-2 rounded-full text-sm font-semibold text-blue-700">
//                 <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500" />
//                 <span className="text-xs sm:text-sm">Skips: {skips}</span>
//             </div>
//         </header>
//     );
// }

import React from "react";
import { logout } from "../firebase";

export default function Header({ skips, user }) {
    return (
        <header className="bg-white rounded-3xl p-4 sm:p-6 shadow-md flex flex-col sm:flex-row items-center sm:justify-between mx-auto max-w-2xl">
            <div className="flex items-center gap-3">
                {/* <img src={user.photoURL} alt="avatar" className="w-8 h-8 rounded-full" /> */}
                {/* <h1 className="text-xl font-bold">Checkadamic</h1> */}
                <h1 className="text-xl sm:text-xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-red-800 via-blue-900 to-red-500">
                    Checkadamic
                </h1>
            </div>
            <div className="flex items-center gap-2">
                <span className="text-sm">Skips: {skips}</span>
                <img src={user.photoURL} alt="avatar" className="w-8 h-8 rounded-full" />
                <div>
                    {user.displayName.split(" ")[0]}
                </div>


                <button
                    onClick={logout}
                    className="text-sm bg-gray-200 hover:bg-gray-300 px-3 py-1 rounded"
                >
                    Logout
                </button>
            </div>
        </header>
    );
}
