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
import { signOut } from '@/lib/auth';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import * as dbUsers from '@/lib/db/users';
 
import { Link, useNavigate, useParams } from 'react-router-dom';

export default function Settings() {
  const { pipelineId = 'default' } = useParams();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const slugify = (name: string) => name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || `stage-${Math.random().toString(36).slice(2,6)}`;
  const [tiers, setTiers] = useState<{ name: string; active: boolean }[]>([]);
  const [newTier, setNewTier] = useState('');
  const [tiersOpen, setTiersOpen] = useState(false);
  const [pipelineList, setPipelineList] = useState<any[]>([]);
  const [originalPipelineNames, setOriginalPipelineNames] = useState<Record<number, string>>({});
  const [newPipelineName, setNewPipelineName] = useState('');
  const [pipelinesOpen, setPipelinesOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [infoText, setInfoText] = useState('');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [phasesOpen, setPhasesOpen] = useState(false);

  const [members, setMembers] = useState<any[]>([]);
  const [membersByPipeline, setMembersByPipeline] = useState<Record<string, any[]>>({});
  const [newMemberByPipeline, setNewMemberByPipeline] = useState<Record<string, { name: string; email: string; role: string }>>({});
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [staffSearchOpen, setStaffSearchOpen] = useState<Record<string, boolean>>({});
  const [staffSearchQuery, setStaffSearchQuery] = useState<Record<string, string>>({});

  const [pipelineStages, setPipelineStagesState] = useState<any[]>([]);
  const baseStages = pipelineStages.length > 0 ? pipelineStages : defaultStages;
  const [stageNames, setStageNames] = useState<Record<string, string>>({});
  const [stageColors, setStageColors] = useState<Record<string, string>>({});
  const [phasesByPipeline, setPhasesByPipeline] = useState<Record<string, string[]>>({});
  const [newPhaseByPipeline, setNewPhaseByPipeline] = useState<Record<string, string>>({});
  const [stagesByPipeline, setStagesByPipeline] = useState<Record<string, { id: string; name: string; color: string; order?: number }[]>>({});
  const [newStageNameByPipeline, setNewStageNameByPipeline] = useState<Record<string, string>>({});
  const [newStageColorByPipeline, setNewStageColorByPipeline] = useState<Record<string, string>>({});
  const [stagesOpen, setStagesOpen] = useState(false);

  // Load data from Supabase on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [pipelines, subscriptionTiers, user, users] = await Promise.all([
          getPipelines(),
          getSubscriptionTierObjects(),
          getCurrentUser(),
          dbUsers.getUsers(),
        ]);
        const unread = user ? await getUnreadNotificationCount(user.id) : 0;
        console.log('Loaded pipelines:', pipelines);
        setPipelineList(pipelines);
        // Store original names for tracking changes
        const originalNames: Record<number, string> = {};
        pipelines.forEach(p => {
          originalNames[p.id] = p.name;
        });
        setOriginalPipelineNames(originalNames);
        setTiers(subscriptionTiers);
        setCurrentUser(user);
        setUnreadCount(unread);
        setAllUsers(users);
      } catch (error) {
        console.error('Error loading settings data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Load data for ALL pipelines that manager can access
  useEffect(() => {
    const loadAllPipelineData = async () => {
      try {
        // Load data for all pipelines in pipelineList
        const allMembers: Record<string, any[]> = {};
        const allStages: Record<string, { id: string; name: string; color: string; order?: number }[]> = {};
        const allPhases: Record<string, string[]> = {};
        
        // Load data for each pipeline
        for (const pipeline of pipelineList) {
          try {
            const [pipelineMembers, pipelineStagesData, activityPhases] = await Promise.all([
              getPipelineMembers(pipeline.id),
              getPipelineStages(pipeline.id),
              getPipelineActivityPhases(pipeline.id),
            ]);
            
            // Store members by pipeline name (use Record type)
            allMembers[pipeline.name] = pipelineMembers;
            
            // Store stages by pipeline name
            allStages[pipeline.name] = pipelineStagesData.map((s: any) => ({
              id: s.id,
              name: s.name,
              color: s.color || 'stage-new',
              order: s.order || 0,
            }));
            
            // Store phases by pipeline name
            allPhases[pipeline.name] = activityPhases;
          } catch (error) {
            console.error(`Error loading data for pipeline ${pipeline.name}:`, error);
          }
        }
        
        // Set all data
        setMembersByPipeline(allMembers);
        setStagesByPipeline(allStages);
        setPhasesByPipeline(allPhases);
        
        // Set members for current pipeline (for backward compatibility)
        if (pipelineId && allMembers[pipelineId]) {
          setMembers(allMembers[pipelineId]);
        }
        
        // Set stages for current pipeline (for backward compatibility)
        if (pipelineId && allStages[pipelineId]) {
          setPipelineStagesState(allStages[pipelineId]);
        }
      } catch (error) {
        console.error('Error loading all pipeline data:', error);
      }
    };
    
    // Only load if we have pipelines
    if (pipelineList.length > 0) {
      loadAllPipelineData();
    }
  }, [pipelineList, pipelineId]);
  
  // Also load data when pipelineId changes (for backward compatibility and immediate display)
  useEffect(() => {
    const loadPipelineData = async () => {
      if (!pipelineId || pipelineList.length === 0) return;
      try {
        // Get pipeline ID from name (slug)
        const { getPipelineIdByName, createPipeline } = await import('@/lib/db/pipelines');
        let pipelineIdNum = await getPipelineIdByName(pipelineId);
        
        // If pipeline not found, don't create automatically
        // User should create pipelines manually through the UI
        if (!pipelineIdNum) {
          console.warn('Pipeline not found:', pipelineId);
          // Don't create pipeline automatically - just return
          return;
        }
        
        // Load data for current pipeline
        const [pipelineMembers, pipelineStagesData, activityPhases] = await Promise.all([
          getPipelineMembers(pipelineIdNum),
          getPipelineStages(pipelineIdNum),
          getPipelineActivityPhases(pipelineIdNum),
        ]);
        
        // Update state for current pipeline
        setMembers(pipelineMembers);
        setPipelineStagesState(pipelineStagesData);
        setPhasesByPipeline(prev => ({ ...prev, [pipelineId]: activityPhases }));
        
        // Convert stages to stagesByPipeline format (using name as key)
        const stagesMap: Record<string, { id: string; name: string; color: string; order?: number }[]> = {};
        stagesMap[pipelineId] = pipelineStagesData.map((s: any) => ({
          id: s.id,
          name: s.name,
          color: s.color || 'stage-new',
          order: s.order || 0,
        }));
        setStagesByPipeline(prev => ({ ...prev, ...stagesMap }));
      } catch (error) {
        console.error('Error loading pipeline data:', error);
      }
    };
    loadPipelineData();
  }, [pipelineId]);

  // Save tiers to Supabase when they change
  useEffect(() => {
    if (tiers.length > 0) {
      setSubscriptionTierObjects(tiers).catch(console.error);
    }
  }, [tiers]);

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


  const saveStages = async () => {
    const payload = Object.entries(stageNames).map(([id, name]) => ({ id, name, color: stageColors[id] }));
    await setPipelineStages(pipelineId, payload);
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
            <Select value={pipelineId} onValueChange={(name) => { try { localStorage.setItem('lastPipelineName', name); } catch {}; navigate(`/pipeline/${name}/settings`);} }>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Select pipeline" />
              </SelectTrigger>
              <SelectContent>
                {pipelineList.filter(p => p.name && p.name.trim() !== '').map(p => (
                  <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="rounded-full relative">
                  {currentUser && (
                    <>
                      <MemberAvatar member={currentUser} size="md" />
                      {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1.5 text-[10px] font-semibold text-white bg-red-500 rounded-full border-2 border-background">
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                      )}
                    </>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => navigate(`/pipeline/${pipelineId}/settings`)}>Settings</DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate(`/profile`)}>Profile</DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate(`/notifications`)}>
                  Notifications
                </DropdownMenuItem>
                <DropdownMenuItem onClick={async () => {
                  try {
                    await signOut();
                  } catch (error) {
                    console.error('Error signing out:', error);
                  }
                  // Clear legacy token as fallback
                  try {
                    localStorage.removeItem('sb:token');
                  } catch {}
                  navigate('/login');
                }}>Logout</DropdownMenuItem>
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
              {loading ? (
                <div className="text-sm text-muted-foreground py-4 text-center">
                  Loading pipelines...
                </div>
              ) : (
            <>
              <div className="flex gap-2">
                <Input placeholder="New pipeline name" value={newPipelineName} onChange={(e) => setNewPipelineName(e.target.value)} />
                    <Button onClick={async () => {
                  const n = newPipelineName.trim();
                  if (!n) return;
                      try {
                        // Create pipeline in Supabase (ID is auto-generated, name is used as slug)
                        const { createPipeline } = await import('@/lib/db/pipelines');
                        const created = await createPipeline(n);
                        const next = [...pipelineList, created];
                  setPipelineList(next);
                        // Update original names map
                        setOriginalPipelineNames(prev => ({ ...prev, [created.id]: created.name }));
                  setNewPipelineName('');
                      } catch (error) {
                        console.error('Error creating pipeline:', error);
                        alert(`Error creating pipeline: ${error instanceof Error ? error.message : 'Unknown error'}`);
                      }
                }}>Create</Button>
              </div>
              <div className="space-y-2">
                    {pipelineList.length === 0 ? (
                      <div className="text-sm text-muted-foreground py-4 text-center">
                        No pipelines yet. Create one above.
                      </div>
                    ) : (
                      pipelineList.map(p => (
                  <div key={p.id} className="flex items-center justify-between border rounded-md px-3 py-2">
                    <div className="flex flex-col">
                      <Input
                        className="font-medium"
                        value={p.name}
                        onChange={(e) => {
                          const name = e.target.value;
                          setPipelineList(prev => prev.map(x => x.id === p.id ? { ...x, name } : x));
                        }}
                              onBlur={async (e) => {
                                const newName = e.target.value.trim();
                                const oldName = originalPipelineNames[p.id] || p.name; // Get original name from stored map
                                if (!newName || newName === oldName) {
                                  // If name unchanged, revert to original in case user typed and then changed back
                                  if (p.name !== oldName) {
                                    setPipelineList(prev => prev.map(x => x.id === p.id ? { ...x, name: oldName } : x));
                                  }
                                  return;
                                }
                                try {
                                  const { updatePipeline } = await import('@/lib/db/pipelines');
                                  // updatePipeline takes (id, name) - it will check for duplicates internally
                                  await updatePipeline(p.id, newName);
                                  
                                  // Update pipeline list with new name
                          setPipelineList(prev => {
                                    const updated = prev.map(x => x.id === p.id ? { ...x, name: newName } : x);
                                    return updated;
                                  });
                                  
                                  // Update original names map
                                  setOriginalPipelineNames(prev => ({ ...prev, [p.id]: newName }));
                                  
                                  // If name changed and we're currently viewing this pipeline, redirect to new URL
                                  if (pipelineId === oldName) {
                                    navigate(`/pipeline/${newName}/settings`, { replace: true });
                                  }
                                } catch (error) {
                                  console.error('Error updating pipeline:', error);
                                  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                                  // Check if it's a unique constraint violation
                                  if (errorMessage.includes('already exists') || errorMessage.includes('unique') || errorMessage.includes('409')) {
                                    alert(`Pipeline name "${newName}" already exists. Please choose a different name.`);
                                  } else {
                                    alert(`Error updating pipeline: ${errorMessage}`);
                                  }
                                  // Revert to original name
                                  setPipelineList(prev => prev.map(x => x.id === p.id ? { ...x, name: oldName } : x));
                                }
                        }}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => navigate(`/pipeline/${p.name}`)}>Open</Button>
                            <Button variant="outline" size="sm" onClick={() => navigate(`/pipeline/${p.name}/settings`)}>Settings</Button>
                    </div>
                  </div>
                      ))
                    )}
              </div>
                </>
              )}
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
            <h2 className="text-xl font-semibold">Add Staff</h2>
            <Button variant="ghost" size="sm" onClick={() => setInviteOpen(v => !v)}>
              <ChevronDown className={`w-4 h-4 mr-2 transition-transform ${inviteOpen ? 'rotate-180' : ''}`} />
              {inviteOpen ? 'Collapse' : 'Expand'}
            </Button>
          </div>
          {inviteOpen && (
          <Tabs defaultValue={pipelineId} className="w-full">
            <TabsList>
              {pipelineList.map(p => (
                <TabsTrigger key={p.id} value={p.name}>{p.name}</TabsTrigger>
              ))}
            </TabsList>
            {pipelineList.map(p => {
              const searchQuery = staffSearchQuery[p.name] || '';
              const isSearching = searchQuery.startsWith('@');
              const queryText = searchQuery.startsWith('@') ? searchQuery.slice(1) : '';
              // Filter users: if query is empty (just @), show all users; otherwise filter by query
              const filteredUsers = isSearching 
                ? (queryText.trim() === '' 
                    ? allUsers 
                    : allUsers.filter(user => {
                        const query = queryText.toLowerCase();
                        return (
                          user.name?.toLowerCase().includes(query) ||
                          user.email?.toLowerCase().includes(query)
                        );
                      }))
                : [];
              const selectedUser = newMemberByPipeline[p.name];
              
              return (
              <TabsContent key={p.id} value={p.name}>
                <div className="flex items-center gap-2">
                  <Popover 
                    open={staffSearchOpen[p.name] || false} 
                    onOpenChange={(open) => setStaffSearchOpen(prev => ({ ...prev, [p.name]: open }))}
                  >
                    <PopoverTrigger asChild>
                      <Input
                        placeholder="Type @ to search staff..."
                        value={searchQuery}
                        className="flex-1"
                        onChange={(e) => {
                          const value = e.target.value;
                          setStaffSearchQuery(prev => ({ ...prev, [p.name]: value }));
                          if (value.startsWith('@')) {
                            setStaffSearchOpen(prev => ({ ...prev, [p.name]: true }));
                          } else if (!value) {
                            setStaffSearchOpen(prev => ({ ...prev, [p.name]: false }));
                            setNewMemberByPipeline(prev => ({ ...prev, [p.name]: { name: '', email: '', role: 'staff' } }));
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === '@' && !searchQuery) {
                            setStaffSearchQuery(prev => ({ ...prev, [p.name]: '@' }));
                            setStaffSearchOpen(prev => ({ ...prev, [p.name]: true }));
                          }
                        }}
                      />
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0" align="start">
                      <Command shouldFilter={false}>
                        <CommandInput 
                          placeholder="Search by name or email..." 
                          value={queryText}
                          onValueChange={(value) => {
                            setStaffSearchQuery(prev => ({ ...prev, [p.name]: `@${value}` }));
                          }}
                        />
                        <CommandList>
                          <CommandEmpty>No staff found.</CommandEmpty>
                          <CommandGroup>
                            {filteredUsers.map((user) => {
                              const isAlreadyMember = (membersByPipeline[p.name] || []).some((m: any) => m.id === user.id);
                              return (
                                <CommandItem
                                  key={user.id}
                                  value={`${user.name} ${user.email || ''}`}
                                  disabled={isAlreadyMember}
                                  onSelect={() => {
                                    setNewMemberByPipeline(prev => ({
                                      ...prev,
                                      [p.name]: {
                                        name: user.name,
                                        email: user.email || '',
                                        role: 'staff'
                                      }
                                    }));
                                    setStaffSearchQuery(prev => ({ ...prev, [p.name]: `${user.name} (${user.email})` }));
                                    setStaffSearchOpen(prev => ({ ...prev, [p.name]: false }));
                                  }}
                                >
                                  <div className="flex items-center gap-2 w-full">
                                    <img src={user.avatar} className="w-6 h-6 rounded-full" />
                                    <div className="flex-1">
                                      <div className="text-sm font-medium">{user.name}</div>
                                      {user.email && <div className="text-xs text-muted-foreground">{user.email}</div>}
                                    </div>
                                    {isAlreadyMember && (
                                      <span className="text-xs text-muted-foreground">Already added</span>
                                    )}
                                  </div>
                                </CommandItem>
                              );
                            })}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  {selectedUser && (
                    <>
                  <Input
                    placeholder="Name"
                        value={selectedUser.name}
                        readOnly
                        className="flex-1"
                  />
                  <Input
                    type="email"
                    placeholder="Email"
                        value={selectedUser.email}
                        readOnly
                        className="flex-1"
                      />
                    </>
                  )}
                  {!selectedUser && (
                    <>
                      <Input placeholder="Name" disabled className="flex-1" />
                      <Input type="email" placeholder="Email" disabled className="flex-1" />
                    </>
                  )}
                  <Select 
                    value={(newMemberByPipeline[p.name]?.role) || 'staff'} 
                    onValueChange={(val) => setNewMemberByPipeline(v => ({ ...v, [p.name]: { ...(v[p.name] || { name: '', email: '', role: 'staff' }), role: val } }))}
                  >
                    <SelectTrigger className="w-[120px]">
                      <SelectValue placeholder="Role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="staff">Staff</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button 
                    onClick={async () => {
                      const nm = newMemberByPipeline[p.name];
                      if (!nm || !nm.name || !nm.email) {
                        setInfoText('Please select a staff member first');
                        setInfoOpen(true);
                          return;
                        }
                      const current = membersByPipeline[p.name] || [];
                      const existsInPipeline = current.some((x: any) => x.id === allUsers.find(u => u.email === nm.email)?.id);
                      if (existsInPipeline) {
                        setInfoText('This staff is already added to this pipeline');
                        setInfoOpen(true);
                        return;
                      }
                      const user = allUsers.find(u => u.email === nm.email);
                      if (!user) {
                        setInfoText('Staff not found. Please add them to Supabase first.');
                        setInfoOpen(true);
                          return;
                        }
                      const memberToAdd = {
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        avatar: user.avatar,
                        role: nm.role as 'staff' | 'manager',
                      };
                      const next = [...current, memberToAdd];
                      try {
                        await setPipelineMembers(p.id, next);
                        setMembersByPipeline(prev => ({ ...prev, [p.name]: next }));
                        if (p.name === pipelineId) setMembers(next);
                        setNewMemberByPipeline(v => ({ ...v, [p.name]: { name: '', email: '', role: 'staff' } }));
                        setStaffSearchQuery(prev => ({ ...prev, [p.name]: '' }));
                      } catch (error) {
                        console.error('Error adding staff:', error);
                        setInfoText('Failed to add staff. Please try again.');
                        setInfoOpen(true);
                      }
                    }}
                    disabled={!selectedUser}
                  >
                    Add Staff
                  </Button>
                </div>
                <div className="space-y-2 mt-3">
                  {(membersByPipeline[p.name] || []).map(m => (
                      <div key={`${m.id}-${p.id}`} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <img src={m.avatar} className="w-8 h-8 rounded-full" />
                          <span className="text-sm">{m.name}</span>
                          {m.email && <span className="text-xs text-muted-foreground">{m.email}</span>}
                          <span className="text-xs text-muted-foreground">{m.role}</span>
                        </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          const current = membersByPipeline[p.name] || [];
                          const next = current.filter((x: any) => x.id !== m.id);
                          try {
                            await setPipelineMembers(p.id, next);
                            setMembersByPipeline(prev => ({ ...prev, [p.name]: next }));
                            if (p.name === pipelineId) setMembers(next);
                          } catch (error) {
                            console.error('Error removing staff:', error);
                            setInfoText('Failed to remove staff. Please try again.');
                            setInfoOpen(true);
                          }
                        }}
                      >
                        Remove
                      </Button>
                        </div>
                  ))}
                      </div>
              </TabsContent>
                    );
                  })}
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
              {pipelineList.map(p => (
                <TabsTrigger key={p.id} value={p.name}>{p.name}</TabsTrigger>
              ))}
            </TabsList>
            {pipelineList.map(p => (
              <TabsContent key={p.id} value={p.name}>
                <div className="flex gap-2">
                  <Input
                    placeholder="New phase"
                    value={newPhaseByPipeline[p.name] || ''}
                    onChange={(e) => setNewPhaseByPipeline(prev => ({ ...prev, [p.name]: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const v = (e.target as HTMLInputElement).value.trim();
                        if (!v) return;
                        const list = phasesByPipeline[p.name] || [];
                        if (list.some(x => x.toLowerCase() === v.toLowerCase())) { setNewPhaseByPipeline(prev => ({ ...prev, [p.name]: '' })); return; }
                        const next = [...list, v];
                        setPhasesByPipeline(prev => ({ ...prev, [p.name]: next }));
                        setPipelineActivityPhases(p.id, next).catch(console.error);
                        setNewPhaseByPipeline(prev => ({ ...prev, [p.name]: '' }));
                      }
                    }}
                  />
                  <Button onClick={() => {
                    const v = (newPhaseByPipeline[p.name] || '').trim();
                    if (!v) return;
                    const list = phasesByPipeline[p.name] || [];
                    if (list.some(x => x.toLowerCase() === v.toLowerCase())) { setNewPhaseByPipeline(prev => ({ ...prev, [p.name]: '' })); return; }
                    const next = [...list, v];
                    setPhasesByPipeline(prev => ({ ...prev, [p.name]: next }));
                    setPipelineActivityPhases(p.id, next);
                    setNewPhaseByPipeline(prev => ({ ...prev, [p.name]: '' }));
                  }}>Add</Button>
                </div>
                <div className="space-y-2">
                  {(phasesByPipeline[p.name] || []).map((phase, idx) => (
                    <div key={`${phase}-${idx}`} className="flex items-center justify-between border rounded-md px-2 py-2">
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground w-6">#{idx + 1}</span>
                        <Input
                          className="min-w-[180px]"
                          value={phase}
                          onChange={(e) => {
                            const name = e.target.value;
                            setPhasesByPipeline(prev => {
                              const list = [...(prev[p.name] || [])];
                              list[idx] = name;
                              return { ...prev, [p.name]: list };
                            });
                          }}
                          onBlur={(e) => {
                            const name = e.target.value.trim();
                            setPhasesByPipeline(prev => {
                              const list = [...(prev[p.name] || [])];
                              const dup = list.some((x, i) => i !== idx && x.toLowerCase() === name.toLowerCase());
                              list[idx] = (!name || dup) ? list[idx] : name;
                              setPipelineActivityPhases(p.id, list);
                              return { ...prev, [p.name]: list };
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
                              const list = [...(prev[p.name] || [])];
                              const tmp = list[idx - 1];
                              list[idx - 1] = list[idx];
                              list[idx] = tmp;
                              setPipelineActivityPhases(p.id, list);
                              return { ...prev, [p.name]: list };
                            });
                          }}
                        >Up</Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={idx === (phasesByPipeline[p.name] || []).length - 1}
                          onClick={() => {
                            setPhasesByPipeline(prev => {
                              const list = [...(prev[p.name] || [])];
                              const tmp = list[idx + 1];
                              list[idx + 1] = list[idx];
                              list[idx] = tmp;
                              setPipelineActivityPhases(p.id, list);
                              return { ...prev, [p.name]: list };
                            });
                          }}
                        >Down</Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setPhasesByPipeline(prev => {
                              const list = (prev[p.name] || []).filter((_, i) => i !== idx);
                              setPipelineActivityPhases(p.id, list);
                              return { ...prev, [p.name]: list };
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
              {pipelineList.map(p => (
                <TabsTrigger key={p.id} value={p.name}>{p.name}</TabsTrigger>
              ))}
            </TabsList>
            {pipelineList.map(p => (
              <TabsContent key={p.id} value={p.name}>
                <div className="grid grid-cols-3 gap-2 items-center mb-3">
                  <Input
                    placeholder="New stage name"
                    value={newStageNameByPipeline[p.name] || ''}
                    onChange={(e) => setNewStageNameByPipeline(prev => ({ ...prev, [p.name]: e.target.value }))}
                  />
                  <Select value={(newStageColorByPipeline[p.name] as any) || 'stage-new'} onValueChange={(val) => setNewStageColorByPipeline(prev => ({ ...prev, [p.name]: val }))}>
                    <SelectTrigger className="w-full">
                      <span style={{ pointerEvents: 'none' }}>
                        {(() => {
                          const selectedColor = (newStageColorByPipeline[p.name] as any) || 'stage-new';
                          const colors = getStageColorClasses('new', selectedColor);
                          return (
                            <div className={cn('flex items-center gap-2 rounded-md px-2 py-1', colors.bgLight, colors.text)}>
                              <div className={cn('w-4 h-4 rounded-full', colors.bg)} />
                              <div className="h-3 w-12 rounded-sm bg-background/30" />
                            </div>
                          );
                        })()}
                      </span>
                      <SelectValue placeholder="Select color" className="absolute opacity-0 pointer-events-none w-0 h-0 overflow-hidden">{''}</SelectValue>
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
                    const name = (newStageNameByPipeline[p.name] || '').trim();
                    if (!name) return;
                    const color = (newStageColorByPipeline[p.name] as any) || 'stage-new';
                    const base = slugify(name);
                    const existing = new Set((stagesByPipeline[p.name] || []).map(s => s.id));
                    let id = base;
                    let i = 2; while (existing.has(id)) { id = `${base}-${i++}`; }
                    const order = Math.max(0, ...((stagesByPipeline[p.name] || []).map(s => s.order || 0))) + 1;
                    const created = { id, name, color, order };
                    setStagesByPipeline(prev => {
                      const list = [ ...(prev[p.name] || []), created ];
                      setPipelineStages(p.id, list);
                      return { ...prev, [p.name]: list };
                    });
                    setNewStageNameByPipeline(prev => ({ ...prev, [p.name]: '' }));
                    setNewStageColorByPipeline(prev => ({ ...prev, [p.name]: 'stage-new' }));
                  }}>Add Stage</Button>
                </div>
                <div className="space-y-2">
                  {(stagesByPipeline[p.name] || []).map((s: any, idx: number) => (
                    <div key={s.id} className="grid grid-cols-3 gap-2 items-center">
                      <span className="text-sm">{s.id}</span>
                      <Input
                        value={s.name}
                        onChange={e => {
                          const name = e.target.value;
                          setStagesByPipeline(prev => {
                            const list = [...(prev[p.name] || [])];
                            list[idx] = { ...list[idx], name };
                            return { ...prev, [p.name]: list };
                          });
                        }}
                        onBlur={e => {
                          const name = e.target.value.trim();
                          setStagesByPipeline(prev => {
                            const list = [...(prev[p.name] || [])];
                            const next = list.map((x, i) => i === idx ? { ...x, name: name || x.name } : x);
                            setPipelineStages(p.id, next);
                            return { ...prev, [p.name]: next };
                          });
                        }}
                      />
                      <Select
                        value={s.color}
                        onValueChange={(val) => {
                          setStagesByPipeline(prev => {
                            const list = [...(prev[p.name] || [])];
                            list[idx] = { ...list[idx], color: val } as any;
                            setPipelineStages(p.id, list);
                            return { ...prev, [p.name]: list };
                          });
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <span style={{ pointerEvents: 'none' }}>
                            {(() => {
                              const colors = getStageColorClasses('new', s.color as any);
                              return (
                                <div className={cn('flex items-center gap-2 rounded-md px-2 py-1', colors.bgLight, colors.text)}>
                                  <div className={cn('w-4 h-4 rounded-full', colors.bg)} />
                                  <div className="h-3 w-12 rounded-sm bg-background/30" />
                                </div>
                              );
                            })()}
                          </span>
                          <SelectValue placeholder="Select color" className="absolute opacity-0 pointer-events-none w-0 h-0 overflow-hidden">{''}</SelectValue>
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
                  <Button onClick={() => setPipelineStages(p.id, stagesByPipeline[p.name] || [])}>Save</Button>
                </div>
              </TabsContent>
            ))}
          </Tabs>
          )}
        </section>
        
        {/* Save All Button */}
        <div className="flex justify-end pt-6 border-t border-border">
          <Button 
            size="lg" 
            onClick={async () => {
              try {
                const errors: string[] = [];

                // Save subscription tiers
                try {
                  if (tiers.length > 0) {
                    await setSubscriptionTierObjects(tiers);
                  }
                } catch (error) {
                  errors.push(`Subscription tiers: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }

                // Save all pipeline names
                for (const pipeline of pipelineList) {
                  try {
                    const { updatePipeline } = await import('@/lib/db/pipelines');
                    // updatePipeline takes (id, name) - it will check for duplicates and handle 409 errors
                    await updatePipeline(pipeline.id, pipeline.name);
                  } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                    // Provide more helpful error message for duplicate names
                    if (errorMessage.includes('already exists') || errorMessage.includes('unique') || errorMessage.includes('409')) {
                      errors.push(`Pipeline "${pipeline.name}": Name already exists. Please choose a different name.`);
                    } else {
                      errors.push(`Pipeline "${pipeline.name}": ${errorMessage}`);
                    }
                  }
                }

                // Save all activity phases for all pipelines
                for (const pipeline of pipelineList) {
                  try {
                    // Use name as key (since phasesByPipeline uses name as key)
                    const phases = phasesByPipeline[pipeline.name] || [];
                    await setPipelineActivityPhases(pipeline.id, phases);
                  } catch (error) {
                    errors.push(`Activity phases for ${pipeline.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
                  }
                }

                // Save all stages for all pipelines
                for (const pipeline of pipelineList) {
                  try {
                    // Use name as key (since stagesByPipeline uses name as key)
                    const stages = stagesByPipeline[pipeline.name] || [];
                    if (stages.length > 0) {
                      await setPipelineStages(pipeline.id, stages);
                    }
                  } catch (error) {
                    errors.push(`Stages for ${pipeline.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
                  }
                }

                // Save all members for all pipelines
                for (const pipeline of pipelineList) {
                  try {
                    // Use name as key (since membersByPipeline uses name as key)
                    const members = membersByPipeline[pipeline.name] || [];
                    await setPipelineMembers(pipeline.id, members);
                  } catch (error) {
                    errors.push(`Members for ${pipeline.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
                  }
                }

                // Show result message
                if (errors.length > 0) {
                  setInfoText(`Some errors occurred:\n${errors.join('\n')}`);
                } else {
                  setInfoText('All changes saved successfully!');
                }
                setInfoOpen(true);
              } catch (error) {
                console.error('Error saving settings:', error);
                setInfoText(`Error saving changes: ${error instanceof Error ? error.message : 'Unknown error'}`);
                setInfoOpen(true);
              }
            }}
          >
            Save All Changes
          </Button>
        </div>

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
