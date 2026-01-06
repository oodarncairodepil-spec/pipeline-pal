import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MemberAvatar } from '@/components/MemberAvatar';
import { getCurrentUser, setCurrentUser } from '@/lib/settings';
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppHeader } from '@/components/AppHeader';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { TeamMember } from '@/types/pipeline';

export default function Profile() {
  const navigate = useNavigate();
  const [initial, setInitial] = useState<TeamMember | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [avatar, setAvatar] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showAvatarSelection, setShowAvatarSelection] = useState(false);
  const [loading, setLoading] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await getCurrentUser();
        setInitial(user);
        setName(user.name || '');
        setEmail(user.email || '');
        setAvatar(user.avatar || '');
      } catch (error) {
        console.error('Error loading user:', error);
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, []);

  const presets = ['Alex','Jamie','Taylor','Rina','Budi','Ava','Sam'];
  const avatarUrl = (seed: string) => `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}&backgroundColor=b6e3f4`;

  if (loading || !initial) {
    return (
      <>
        <Helmet><title>Profile</title></Helmet>
        <AppHeader title="Profile" subtitle="Update your info and avatar" hideSearchAndFilter />
        <div className="p-6 space-y-6">
          <div className="text-center text-muted-foreground">Loading...</div>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet><title>Profile</title></Helmet>
      <AppHeader title="Profile" subtitle="Update your info and avatar" hideSearchAndFilter />
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <MemberAvatar member={{ id: initial.id, name, avatar, role: initial.role, email }} size="md" />
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
          <Button onClick={async () => {
            try {
              await setCurrentUser({ id: initial.id, name, email, avatar, role: initial.role });
              navigate(`/pipeline/default`);
            } catch (error) {
              console.error('Error saving profile:', error);
              alert('Failed to save profile. Please try again.');
            }
          }}>Save</Button>
        </div>
      </div>
    </>
  );
}
