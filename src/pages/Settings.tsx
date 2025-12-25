import { Helmet } from 'react-helmet-async';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getSubscriptionTierObjects, setSubscriptionTierObjects, getSubscriptionTiers, setSubscriptionTiers, getPipelineMembers, setPipelineMembers, getPipelineStages, setPipelineStages, getPipelineActivityPhases, setPipelineActivityPhases, getPipelines, setPipelines } from '@/lib/settings';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MemberAvatar } from '@/components/MemberAvatar';
import { getCurrentUser, getNotificationsForUser, getUnreadNotificationCount } from '@/lib/settings';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { stages as defaultStages, teamMembers as defaultTeam } from '@/data/mockData';
import { getStageColorClasses } from '@/lib/pipeline-utils';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
 
import { Link, useNavigate, useParams } from 'react-router-dom';

export default function Settings() {
  const { pipelineId = 'default' } = useParams();
  const navigate = useNavigate();
  const currentUser = getCurrentUser();
  const unreadCount = getUnreadNotificationCount(currentUser.id);
  const slugify = (name: string) => name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || `stage-${Math.random().toString(36).slice(2,6)}`;
  const [tiers, setTiers] = useState<{ name: string; active: boolean }[]>(getSubscriptionTierObjects());
  const [newTier, setNewTier] = useState('');
  const [tiersOpen, setTiersOpen] = useState(false);
  const [pipelineList, setPipelineList] = useState(getPipelines());
  const [newPipelineName, setNewPipelineName] = useState('');
  const [pipelinesOpen, setPipelinesOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [infoText, setInfoText] = useState('');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [phasesOpen, setPhasesOpen] = useState(false);

  const [members, setMembers] = useState<any[]>(getPipelineMembers(pipelineId));
  const [newMemberByPipeline, setNewMemberByPipeline] = useState<Record<string, { name: string; email: string; role: string }>>({});

  const pipelineStages = getPipelineStages(pipelineId);
  const baseStages = pipelineStages.length > 0 ? pipelineStages : defaultStages;
  const [stageNames, setStageNames] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    baseStages.forEach((s: any) => { map[s.id] = s.name; });
    return map;
  });
  const [stageColors, setStageColors] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    baseStages.forEach((s: any) => { map[s.id] = s.color; });
    return map;
  });
  const pipelinesList = getPipelines();
  const [phasesByPipeline, setPhasesByPipeline] = useState<Record<string, string[]>>(() => {
    const obj: Record<string, string[]> = {};
    pipelinesList.forEach(p => { obj[p.id] = getPipelineActivityPhases(p.id); });
    return obj;
  });
  const [newPhaseByPipeline, setNewPhaseByPipeline] = useState<Record<string, string>>({});
  const [stagesByPipeline, setStagesByPipeline] = useState<Record<string, { id: string; name: string; color: string; order?: number }[]>>(() => {
    const obj: Record<string, { id: string; name: string; color: string; order?: number }[]> = {};
    pipelinesList.forEach(p => {
      const list = getPipelineStages(p.id);
      obj[p.id] = (Array.isArray(list) && list.length > 0 ? list : defaultStages) as any;
    });
    return obj;
  });
  const [newStageNameByPipeline, setNewStageNameByPipeline] = useState<Record<string, string>>({});
  const [newStageColorByPipeline, setNewStageColorByPipeline] = useState<Record<string, string>>({});
  const [stagesOpen, setStagesOpen] = useState(false);

  useEffect(() => { setSubscriptionTierObjects(tiers); }, [tiers]);

  const addTier = () => {
    if (!newTier.trim()) return;
    const name = newTier.trim();
    if (tiers.some(t => t.name.toLowerCase() === name.toLowerCase())) { setNewTier(''); return; }
    setTiers([...tiers, { name, active: true }]);
    setNewTier('');
  };

  const removeTier = (name: string) => {
    setTiers(tiers.filter(x => x.name !== name));
  };

  const addMember = () => {
    if (!newMember.name.trim()) return;
    const email = newMember.email.trim();
    const emailValid = /.+@.+\..+/.test(email);
    if (!emailValid) return;
    const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `id-${Date.now()}`;
    const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(newMember.name)}&backgroundColor=b6e3f4`;
    const created = { id, name: newMember.name.trim(), email, avatar, role: newMember.role, invitationStatus: 'sent', invitationSentAt: new Date().toISOString() };
    const next = [...members, created];
    setMembers(next);
    setPipelineMembers(pipelineId, next);
    setNewMember({ name: '', email: '', role: 'staff' });
  };

  const saveStages = () => {
    const payload = Object.entries(stageNames).map(([id, name]) => ({ id, name, color: stageColors[id] }));
    setPipelineStages(pipelineId, payload);
  };

  return (
    <>
      <Helmet>
        <title>Settings</title>
      </Helmet>
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-shrink-0 border-b border-border bg-card/80 backdrop-blur-sm px-6 py-4"
      >
        <div className="flex items-center justify-between">
          <div className="cursor-pointer" onClick={() => navigate(`/pipeline/${pipelineId}`)}>
            <h1 className="text-2xl font-bold text-foreground">Settings</h1>
            <p className="text-sm text-muted-foreground">Manage tiers, staff, and stages</p>
          </div>
          <div className="flex items-center gap-4">
            <Select value={pipelineId} onValueChange={(id) => { try { localStorage.setItem('lastPipelineId', id); } catch {}; navigate(`/pipeline/${id}/settings`);} }>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Select pipeline" />
              </SelectTrigger>
              <SelectContent>
                {getPipelines().map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="rounded-full relative">
                  <MemberAvatar member={currentUser} size="md" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1.5 text-[10px] font-semibold text-white bg-red-500 rounded-full border-2 border-background">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => navigate(`/pipeline/${pipelineId}/settings`)}>Settings</DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate(`/profile`)}>Profile</DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate(`/notifications`)}>
                  Notifications ({getNotificationsForUser(getCurrentUser().id).length})
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { try { localStorage.removeItem('sb:token'); } catch {}; navigate('/login'); }}>Logout</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </motion.header>
      <main className="p-6 space-y-8">
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Pipelines</h2>
            <Button variant="ghost" size="sm" onClick={() => setPipelinesOpen(v => !v)}>
              <ChevronDown className={`w-4 h-4 mr-2 transition-transform ${pipelinesOpen ? 'rotate-180' : ''}`} />
              {pipelinesOpen ? 'Collapse' : 'Expand'}
            </Button>
          </div>
          {pipelinesOpen && (
            <>
              <div className="flex gap-2">
                <Input placeholder="New pipeline name" value={newPipelineName} onChange={(e) => setNewPipelineName(e.target.value)} />
                <Button onClick={() => {
                  const n = newPipelineName.trim();
                  if (!n) return;
                  const base = n.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
                  let id = base || `pl-${Math.random().toString(36).slice(2,6)}`;
                  const ids = new Set(pipelineList.map(p => p.id));
                  let i = 2; while (ids.has(id)) { id = `${base}-${i++}`; }
                  const next = [...pipelineList, { id, name: n }];
                  setPipelines(next);
                  setPipelineList(next);
                  setNewPipelineName('');
                }}>Create</Button>
              </div>
              <div className="space-y-2">
                {pipelineList.map(p => (
                  <div key={p.id} className="flex items-center justify-between border rounded-md px-3 py-2">
                    <div className="flex flex-col">
                      <Input
                        className="font-medium"
                        value={p.name}
                        onChange={(e) => {
                          const name = e.target.value;
                          setPipelineList(prev => prev.map(x => x.id === p.id ? { ...x, name } : x));
                        }}
                        onBlur={(e) => {
                          const name = e.target.value.trim();
                          setPipelineList(prev => {
                            const next = prev.map(x => x.id === p.id ? { ...x, name: name || x.name } : x);
                            setPipelines(next);
                            return next;
                          });
                        }}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => navigate(`/pipeline/${p.id}`)}>Open</Button>
                      <Button variant="outline" size="sm" onClick={() => navigate(`/pipeline/${p.id}/settings`)}>Settings</Button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Subscription Tiers</h2>
            <Button variant="ghost" size="sm" onClick={() => setTiersOpen(v => !v)}>
              <ChevronDown className={`w-4 h-4 mr-2 transition-transform ${tiersOpen ? 'rotate-180' : ''}`} />
              {tiersOpen ? 'Collapse' : 'Expand'}
            </Button>
          </div>
          {tiersOpen && (
            <>
              <div className="flex gap-2">
                <Input placeholder="New tier" value={newTier} onChange={e => setNewTier(e.target.value)} />
                <Button onClick={addTier}>Add</Button>
              </div>
              <div className="flex flex-col gap-2">
                {tiers.map((t, idx) => (
                  <div key={t.name} className="flex items-center justify-between border rounded-md px-2 py-2 text-sm">
                    <div className="flex items-center gap-3">
                      <Input
                        className="min-w-[140px]"
                        value={t.name}
                        onChange={(e) => {
                          const name = e.target.value;
                          setTiers(prev => prev.map((x, i) => i === idx ? { ...x, name } : x));
                        }}
                        onBlur={(e) => {
                          const name = e.target.value.trim();
                          setTiers(prev => {
                            const dup = prev.some((x, i) => i !== idx && x.name.toLowerCase() === name.toLowerCase());
                            const next = prev.map((x, i) => i === idx ? { ...x, name: (!name || dup) ? (x.name || 'Tier') : name } : x);
                            return next;
                          });
                        }}
                        placeholder="Tier name"
                      />
                      <Switch checked={t.active} onCheckedChange={(checked) => {
                        setTiers(prev => prev.map((x, i) => i === idx ? { ...x, active: Boolean(checked) } : x));
                      }} />
                      <span className="text-xs text-muted-foreground">{t.active ? 'Active' : 'Inactive'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => removeTier(t.name)}>Remove</Button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Invite Staff</h2>
            <Button variant="ghost" size="sm" onClick={() => setInviteOpen(v => !v)}>
              <ChevronDown className={`w-4 h-4 mr-2 transition-transform ${inviteOpen ? 'rotate-180' : ''}`} />
              {inviteOpen ? 'Collapse' : 'Expand'}
            </Button>
          </div>
          {inviteOpen && (
          <Tabs defaultValue={pipelineId} className="w-full">
            <TabsList>
              {pipelineList.map(p => (
                <TabsTrigger key={p.id} value={p.id}>{p.name}</TabsTrigger>
              ))}
            </TabsList>
            {pipelineList.map(p => (
              <TabsContent key={p.id} value={p.id}>
                <div className="grid grid-cols-4 gap-2">
                  <Input
                    placeholder="Name"
                    value={(newMemberByPipeline[p.id]?.name) || ''}
                    onChange={e => setNewMemberByPipeline(v => ({ ...v, [p.id]: { ...(v[p.id] || { name: '', email: '', role: 'staff' }), name: e.target.value } }))}
                  />
                  <Input
                    type="email"
                    placeholder="Email"
                    value={(newMemberByPipeline[p.id]?.email) || ''}
                    onChange={e => setNewMemberByPipeline(v => ({ ...v, [p.id]: { ...(v[p.id] || { name: '', email: '', role: 'staff' }), email: e.target.value } }))}
                  />
                  <Select value={(newMemberByPipeline[p.id]?.role) || 'staff'} onValueChange={(val) => setNewMemberByPipeline(v => ({ ...v, [p.id]: { ...(v[p.id] || { name: '', email: '', role: 'staff' }), role: val } }))}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="staff">Staff</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                    </SelectContent>
                  </Select>
                  {(() => {
                    const nm = newMemberByPipeline[p.id] || { name: '', email: '', role: 'staff' };
                    const inputEmail = nm.email.trim().toLowerCase();
                    const emailValid = /.+@.+\..+/.test(inputEmail);
                    const allMembers = [...defaultTeam, ...getPipelines().flatMap(pp => getPipelineMembers(pp.id))];
                    const existing = emailValid && inputEmail.length > 0 ? allMembers.find(m => (m.email || '').toLowerCase() === inputEmail) : undefined;
                    const label = existing ? 'Add' : 'Invite';
                    return (
                      <Button onClick={() => {
                        const nameTrim = nm.name.trim();
                        const emailTrim = nm.email.trim();
                        const emailValid = /.+@.+\..+/.test(emailTrim);
                        if (!emailValid) return;
                        if (existing) {
                          const current = getPipelineMembers(p.id);
                          const existsInPipeline = current.some(x => (x.email || '').toLowerCase() === inputEmail);
                          if (existsInPipeline) { setInfoText('This staff is already joined to this pipeline'); setInfoOpen(true); return; }
                          const next = [...current, existing];
                          setPipelineMembers(p.id, next);
                          if (p.id === pipelineId) setMembers(next);
                          setNewMemberByPipeline(v => ({ ...v, [p.id]: { name: '', email: '', role: 'staff' } }));
                          return;
                        }
                        if (!nameTrim) return;
                        const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `id-${Date.now()}`;
                        const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(nm.name)}&backgroundColor=b6e3f4`;
                        const created = { id, name: nameTrim, email: emailTrim, avatar, role: nm.role, invitationStatus: 'sent', invitationSentAt: new Date().toISOString() };
                        const current = getPipelineMembers(p.id);
                        const next = [...current, created];
                        setPipelineMembers(p.id, next);
                        if (p.id === pipelineId) setMembers(next);
                        setNewMemberByPipeline(v => ({ ...v, [p.id]: { name: '', email: '', role: 'staff' } }));
                      }}>{label}</Button>
                    );
                  })()}
                </div>
                <div className="space-y-2 mt-3">
                  {(() => {
                    const combined = [...defaultTeam, ...getPipelineMembers(p.id)];
                    const unique = combined.filter((x, i, arr) => arr.findIndex(y => y.id === x.id) === i);
                    return unique;
                  })().map(m => {
                    const isDefault = !('invitationStatus' in m);
                    const sentAt = m.invitationSentAt ? new Date(m.invitationSentAt) : null;
                    const expired = sentAt ? (Date.now() - sentAt.getTime() > 7 * 24 * 60 * 60 * 1000) : false;
                    const status = isDefault ? 'Registered' : (m.invitationStatus === 'registered' ? 'Registered' : (expired ? 'Invitation expired' : 'Invitation sent'));
                    return (
                      <div key={`${m.id}-${p.id}`} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <img src={m.avatar} className="w-8 h-8 rounded-full" />
                          <span className="text-sm">{m.name}</span>
                          {m.email && <span className="text-xs text-muted-foreground">{m.email}</span>}
                          <span className="text-xs text-muted-foreground">{m.role}</span>
                          <span className="text-xs text-muted-foreground">{status}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {!isDefault && m.invitationStatus !== 'registered' && (
                            <Button variant="outline" size="sm" onClick={() => {
                              const current = getPipelineMembers(p.id);
                              const next = current.map(x => x.id === m.id ? { ...x, invitationStatus: 'sent', invitationSentAt: new Date().toISOString() } : x);
                              setPipelineMembers(p.id, next);
                              if (p.id === pipelineId) setMembers(next);
                            }}>Resend Invitation</Button>
                          )}
                          
                        </div>
                      </div>
                    );
                  })}
                </div>
              </TabsContent>
            ))}
          </Tabs>
          )}
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Activity Phases</h2>
            <Button variant="ghost" size="sm" onClick={() => setPhasesOpen(v => !v)}>
              <ChevronDown className={`w-4 h-4 mr-2 transition-transform ${phasesOpen ? 'rotate-180' : ''}`} />
              {phasesOpen ? 'Collapse' : 'Expand'}
            </Button>
          </div>
          {phasesOpen && (
          <Tabs defaultValue={pipelineId} className="w-full">
            <TabsList>
              {getPipelines().map(p => (
                <TabsTrigger key={p.id} value={p.id}>{p.name}</TabsTrigger>
              ))}
            </TabsList>
            {getPipelines().map(p => (
              <TabsContent key={p.id} value={p.id}>
                <div className="flex gap-2">
                  <Input
                    placeholder="New phase"
                    value={newPhaseByPipeline[p.id] || ''}
                    onChange={(e) => setNewPhaseByPipeline(prev => ({ ...prev, [p.id]: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const v = (e.target as HTMLInputElement).value.trim();
                        if (!v) return;
                        const list = phasesByPipeline[p.id] || [];
                        if (list.some(x => x.toLowerCase() === v.toLowerCase())) { setNewPhaseByPipeline(prev => ({ ...prev, [p.id]: '' })); return; }
                        const next = [...list, v];
                        setPhasesByPipeline(prev => ({ ...prev, [p.id]: next }));
                        setPipelineActivityPhases(p.id, next);
                        setNewPhaseByPipeline(prev => ({ ...prev, [p.id]: '' }));
                      }
                    }}
                  />
                  <Button onClick={() => {
                    const v = (newPhaseByPipeline[p.id] || '').trim();
                    if (!v) return;
                    const list = phasesByPipeline[p.id] || [];
                    if (list.some(x => x.toLowerCase() === v.toLowerCase())) { setNewPhaseByPipeline(prev => ({ ...prev, [p.id]: '' })); return; }
                    const next = [...list, v];
                    setPhasesByPipeline(prev => ({ ...prev, [p.id]: next }));
                    setPipelineActivityPhases(p.id, next);
                    setNewPhaseByPipeline(prev => ({ ...prev, [p.id]: '' }));
                  }}>Add</Button>
                </div>
                <div className="space-y-2">
                  {(phasesByPipeline[p.id] || []).map((phase, idx) => (
                    <div key={`${phase}-${idx}`} className="flex items-center justify-between border rounded-md px-2 py-2">
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground w-6">#{idx + 1}</span>
                        <Input
                          className="min-w-[180px]"
                          value={phase}
                          onChange={(e) => {
                            const name = e.target.value;
                            setPhasesByPipeline(prev => {
                              const list = [...(prev[p.id] || [])];
                              list[idx] = name;
                              return { ...prev, [p.id]: list };
                            });
                          }}
                          onBlur={(e) => {
                            const name = e.target.value.trim();
                            setPhasesByPipeline(prev => {
                              const list = [...(prev[p.id] || [])];
                              const dup = list.some((x, i) => i !== idx && x.toLowerCase() === name.toLowerCase());
                              list[idx] = (!name || dup) ? list[idx] : name;
                              setPipelineActivityPhases(p.id, list);
                              return { ...prev, [p.id]: list };
                            });
                          }}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={idx === 0}
                          onClick={() => {
                            setPhasesByPipeline(prev => {
                              const list = [...(prev[p.id] || [])];
                              const tmp = list[idx - 1];
                              list[idx - 1] = list[idx];
                              list[idx] = tmp;
                              setPipelineActivityPhases(p.id, list);
                              return { ...prev, [p.id]: list };
                            });
                          }}
                        >Up</Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={idx === (phasesByPipeline[p.id] || []).length - 1}
                          onClick={() => {
                            setPhasesByPipeline(prev => {
                              const list = [...(prev[p.id] || [])];
                              const tmp = list[idx + 1];
                              list[idx + 1] = list[idx];
                              list[idx] = tmp;
                              setPipelineActivityPhases(p.id, list);
                              return { ...prev, [p.id]: list };
                            });
                          }}
                        >Down</Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setPhasesByPipeline(prev => {
                              const list = (prev[p.id] || []).filter((_, i) => i !== idx);
                              setPipelineActivityPhases(p.id, list);
                              return { ...prev, [p.id]: list };
                            });
                          }}
                        >Remove</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
            ))}
          </Tabs>
          )}
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Stages</h2>
            <Button variant="ghost" size="sm" onClick={() => setStagesOpen(v => !v)}>
              <ChevronDown className={`w-4 h-4 mr-2 transition-transform ${stagesOpen ? 'rotate-180' : ''}`} />
              {stagesOpen ? 'Collapse' : 'Expand'}
            </Button>
          </div>
          {stagesOpen && (
          <Tabs defaultValue={pipelineId} className="w-full">
            <TabsList>
              {pipelinesList.map(p => (
                <TabsTrigger key={p.id} value={p.id}>{p.name}</TabsTrigger>
              ))}
            </TabsList>
            {pipelinesList.map(p => (
              <TabsContent key={p.id} value={p.id}>
                <div className="grid grid-cols-3 gap-2 items-center mb-3">
                  <Input
                    placeholder="New stage name"
                    value={newStageNameByPipeline[p.id] || ''}
                    onChange={(e) => setNewStageNameByPipeline(prev => ({ ...prev, [p.id]: e.target.value }))}
                  />
                  <Select value={(newStageColorByPipeline[p.id] as any) || 'stage-new'} onValueChange={(val) => setNewStageColorByPipeline(prev => ({ ...prev, [p.id]: val }))}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select color" />
                    </SelectTrigger>
                    <SelectContent>
                      {(['stage-new','stage-called','stage-onboard','stage-live','stage-lost','stage-purple','stage-teal','stage-indigo','stage-pink','stage-orange'] as const).map((variant) => {
                        const colors = getStageColorClasses('new', variant);
                        return (
                          <SelectItem key={variant} value={variant}>
                            <div className={cn('flex items-center gap-2 rounded-md px-2 py-1', colors.bgLight, colors.text)}>
                              <div className={cn('w-4 h-4 rounded-full', colors.bg)} />
                              <div className="h-3 w-12 rounded-sm bg-background/30" />
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <Button onClick={() => {
                    const name = (newStageNameByPipeline[p.id] || '').trim();
                    if (!name) return;
                    const color = (newStageColorByPipeline[p.id] as any) || 'stage-new';
                    const base = slugify(name);
                    const existing = new Set((stagesByPipeline[p.id] || []).map(s => s.id));
                    let id = base;
                    let i = 2; while (existing.has(id)) { id = `${base}-${i++}`; }
                    const order = Math.max(0, ...((stagesByPipeline[p.id] || []).map(s => s.order || 0))) + 1;
                    const created = { id, name, color, order };
                    setStagesByPipeline(prev => {
                      const list = [ ...(prev[p.id] || []), created ];
                      setPipelineStages(p.id, list);
                      return { ...prev, [p.id]: list };
                    });
                    setNewStageNameByPipeline(prev => ({ ...prev, [p.id]: '' }));
                    setNewStageColorByPipeline(prev => ({ ...prev, [p.id]: 'stage-new' }));
                  }}>Add Stage</Button>
                </div>
                <div className="space-y-2">
                  {(stagesByPipeline[p.id] || []).map((s: any, idx: number) => (
                    <div key={s.id} className="grid grid-cols-3 gap-2 items-center">
                      <span className="text-sm">{s.id}</span>
                      <Input
                        value={s.name}
                        onChange={e => {
                          const name = e.target.value;
                          setStagesByPipeline(prev => {
                            const list = [...(prev[p.id] || [])];
                            list[idx] = { ...list[idx], name };
                            return { ...prev, [p.id]: list };
                          });
                        }}
                        onBlur={e => {
                          const name = e.target.value.trim();
                          setStagesByPipeline(prev => {
                            const list = [...(prev[p.id] || [])];
                            const next = list.map((x, i) => i === idx ? { ...x, name: name || x.name } : x);
                            setPipelineStages(p.id, next);
                            return { ...prev, [p.id]: next };
                          });
                        }}
                      />
                      <Select
                        value={s.color}
                        onValueChange={(val) => {
                          setStagesByPipeline(prev => {
                            const list = [...(prev[p.id] || [])];
                            list[idx] = { ...list[idx], color: val } as any;
                            setPipelineStages(p.id, list);
                            return { ...prev, [p.id]: list };
                          });
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select color" />
                        </SelectTrigger>
                        <SelectContent>
                          {(['stage-new','stage-called','stage-onboard','stage-live','stage-lost','stage-purple','stage-teal','stage-indigo','stage-pink','stage-orange'] as const).map((variant) => {
                            const colors = getStageColorClasses('new', variant);
                            return (
                              <SelectItem key={variant} value={variant}>
                                <div className={cn('flex items-center gap-2 rounded-md px-2 py-1', colors.bgLight, colors.text)}>
                                  <div className={cn('w-4 h-4 rounded-full', colors.bg)} />
                                  <div className="h-3 w-12 rounded-sm bg-background/30" />
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
                <div className="flex justify-end mt-2">
                  <Button onClick={() => setPipelineStages(p.id, stagesByPipeline[p.id] || [])}>Save</Button>
                </div>
              </TabsContent>
            ))}
          </Tabs>
          )}
        </section>
        <Dialog open={infoOpen} onOpenChange={setInfoOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{infoText}</DialogTitle>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      </main>
    </>
  );
}
