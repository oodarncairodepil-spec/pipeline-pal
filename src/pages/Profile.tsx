import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MemberAvatar } from '@/components/MemberAvatar';
import { getCurrentUser, setCurrentUser } from '@/lib/settings';
import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppHeader } from '@/components/AppHeader';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export default function Profile() {
  const navigate = useNavigate();
  const initial = getCurrentUser();
  const [name, setName] = useState(initial.name || '');
  const [email, setEmail] = useState(initial.email || '');
  const [avatar, setAvatar] = useState(initial.avatar || '');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showAvatarSelection, setShowAvatarSelection] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const presets = ['Alex','Jamie','Taylor','Rina','Budi','Ava','Sam'];
  const avatarUrl = (seed: string) => `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}&backgroundColor=b6e3f4`;

  return (
    <>
      <Helmet><title>Profile</title></Helmet>
      <AppHeader title="Profile" subtitle="Update your info and avatar" hideSearchAndFilter />
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <MemberAvatar member={{ id: initial.id, name, avatar, role: 'manager', email }} size="md" />
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">Upload</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => {
                  setShowAvatarSelection(true);
                }}>
                  Select from existing avatar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {
                  fileRef.current?.click();
                }}>
                  Upload your own image
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const url = URL.createObjectURL(file);
              setAvatar(url);
            }} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground">Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Email</label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
        </div>
        {showAvatarSelection && (
        <div>
          <label className="text-xs text-muted-foreground">Select avatar</label>
          <div className="flex flex-wrap gap-2 mt-2">
            {presets.map(seed => (
                <button key={seed} className="rounded-md border p-1" onClick={() => {
                  setAvatar(avatarUrl(seed));
                  setShowAvatarSelection(false);
                }}>
                <img src={avatarUrl(seed)} className="w-12 h-12 rounded-md" />
              </button>
            ))}
          </div>
        </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground">Current password</label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">New password</label>
            <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={() => {
            setCurrentUser({ ...initial, name, email, avatar, password: newPassword || password });
            navigate(`/pipeline/default`);
          }}>Save</Button>
        </div>
      </div>
    </>
  );
}
