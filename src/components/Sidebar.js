// src/components/Sidebar.js
//
// Sol menü.

import React from 'react';
import {
  Search, Calendar, X, Settings, Activity,
} from 'lucide-react';
import { MenuButton } from './ortak';

export const Sidebar = ({ aktif, git, user, cikisYap }) => (
  <div className="w-72 bg-white border-r border-gray-200 flex flex-col h-screen sticky top-0 shrink-0">
    <div className="p-8 flex flex-col items-center text-center">
      <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-teal-600 rounded-full flex items-center justify-center text-white font-bold text-2xl mb-4 uppercase">
        {(user.name || '?').charAt(0)}{(user.surname || '').charAt(0)}
      </div>
      <div className="font-bold text-gray-800 text-lg">{user.name} {user.surname}</div>
      <div className="text-gray-500 text-xs mt-1">{user.email}</div>
    </div>

    <nav className="flex-1 px-4 space-y-2">
      <MenuButton icon={Search} label="Besin Arama" isActive={aktif === 'dashboard'} onClick={() => git('dashboard')} />
      <MenuButton icon={Calendar} label="Günlük Takip" isActive={aktif === 'diary'} onClick={() => git('diary')} />
      <MenuButton icon={Activity} label="Tahlil Sonuçları" isActive={aktif === 'lab'} onClick={() => git('lab')} />
    </nav>

    <div className="px-4 pb-6 pt-4 border-t border-gray-100 space-y-2">
      <MenuButton icon={Settings} label="Profil Ayarları" isActive={aktif === 'profile'} onClick={() => git('profile')} isSecondary />
      <button onClick={cikisYap} className="flex items-center gap-3 text-gray-500 hover:bg-red-50 hover:text-red-700 transition w-full px-5 py-3.5 rounded-xl text-sm font-bold">
        <X size={20} /> <span>Oturumu Kapat</span>
      </button>
    </div>
  </div>
);
