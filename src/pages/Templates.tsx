import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { getCurrentAuthUser, signOut } from "@/lib/auth";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MemberAvatar } from "@/components/MemberAvatar";
import { getPipelines, getUnreadNotificationCount } from "@/lib/settings";

interface MessageTemplate {
  id: string;
  name: string;
  body: string;
}

const Templates = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [pipelines, setPipelines] = useState<any[]>([]);
  const [selectedPipeline, setSelectedPipeline] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<MessageTemplate | null>(null);
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const user = await getCurrentAuthUser();
        if (!user) {
          setCurrentUser(null);
          setTemplates([]);
          return;
        }
        setCurrentUser(user);

        // Load pipelines for selector
        try {
          const list = await getPipelines();
          setPipelines(list);
          const last = (() => {
            try {
              return localStorage.getItem("lastPipelineId");
            } catch {
              return null;
            }
          })();
          const initial =
            (last && list.some((p: any) => p.name === last) && last) ||
            (list[0]?.name ?? null);
          setSelectedPipeline(initial);
        } catch (e) {
          console.error("Error loading pipelines", e);
        }

        // Load unread notifications
        try {
          const count = await getUnreadNotificationCount(user.id);
          setUnreadCount(count);
        } catch (e) {
          console.error("Error loading unread count", e);
        }
        const { getTemplatesForUser } = await import("@/lib/db/templates");
        const data = await getTemplatesForUser(user.id);
        setTemplates(data);
      } catch (e) {
        console.error("Error loading templates", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const openNew = () => {
    setEditing(null);
    setName("");
    setBody("");
    setDialogOpen(true);
  };

  const openEdit = (tpl: MessageTemplate) => {
    setEditing(tpl);
    setName(tpl.name);
    setBody(tpl.body);
    setDialogOpen(true);
  };

  const saveTemplate = async () => {
    try {
      const user = await getCurrentAuthUser();
      if (!user) return;
      const { createTemplate, updateTemplate } = await import("@/lib/db/templates");
      if (editing) {
        const updated = await updateTemplate(editing.id, { name, body });
        setTemplates(prev => prev.map(t => (t.id === updated.id ? updated : t)));
      } else {
        const created = await createTemplate(user.id, { name, body });
        setTemplates(prev => [...prev, created]);
      }
      setDialogOpen(false);
    } catch (e) {
      console.error("Error saving template", e);
    }
  };

  const deleteTemplate = async (id: string) => {
    if (!confirm("Delete this template?")) return;
    try {
      const { deleteTemplate } = await import("@/lib/db/templates");
      await deleteTemplate(id);
      setTemplates(prev => prev.filter(t => t.id !== id));
    } catch (e) {
      console.error("Error deleting template", e);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-shrink-0 border-b border-border bg-card/80 backdrop-blur-sm px-6 py-4"
      >
        <div className="flex items-center justify-between">
          <button
            type="button"
            className="text-left"
            onClick={() => navigate(-1)}
          >
            <h1 className="text-2xl font-bold text-foreground">Templates</h1>
            <p className="text-sm text-muted-foreground">
              Manage reusable messages for WhatsApp.
            </p>
          </button>
          <div className="flex items-center gap-4">
            {/* Pipeline selector */}
            <div className="flex items-center gap-2">
              <Select
                value={selectedPipeline ?? ""}
                onValueChange={(name) => {
                  setSelectedPipeline(name);
                  try {
                    localStorage.setItem("lastPipelineId", name);
                  } catch {
                    // ignore
                  }
                  navigate(`/pipeline/${name}`);
                }}
              >
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="Select pipeline" />
                </SelectTrigger>
                <SelectContent>
                  {pipelines
                    .filter((p) => p.name && p.name.trim() !== "")
                    .map((p) => (
                      <SelectItem key={p.id} value={p.name}>
                        {p.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            {/* Avatar menu */}
            <div className="flex items-center">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="rounded-full relative">
                    <MemberAvatar member={currentUser} size="md" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1.5 text-[10px] font-semibold text-white bg-red-500 rounded-full border-2 border-background">
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => navigate("/settings")}>
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/profile")}>
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/notifications")}>
                    Notifications
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={async () => {
                      try {
                        await signOut();
                      } catch (error) {
                        console.error("Error signing out:", error);
                      }
                      try {
                        localStorage.removeItem("sb:token");
                      } catch {
                        // ignore
                      }
                      navigate("/login");
                    }}
                  >
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </motion.header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Message Templates</h2>
              <p className="text-sm text-muted-foreground">
                Create reusable WhatsApp messages to quickly contact your customers.
              </p>
            </div>
            <Button onClick={openNew}>New Template</Button>
          </div>

          {loading ? (
            <div className="text-muted-foreground">Loading templates...</div>
          ) : templates.length === 0 ? (
            <div className="text-sm text-muted-foreground border rounded-md p-4">
              No templates yet. Click &quot;New Template&quot; to create your first one.
            </div>
          ) : (
            <div className="space-y-3">
              {templates.map(t => (
                <div
                  key={t.id}
                  className="border rounded-md p-3 flex items-start justify-between gap-3 bg-card/60"
                >
                  <div className="space-y-1">
                    <div className="font-medium text-foreground">{t.name}</div>
                    <div className="text-xs text-muted-foreground whitespace-pre-line max-h-24 overflow-hidden">
                      {t.body}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEdit(t)}>
                      Edit
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => deleteTemplate(t.id)}>
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editing ? "Edit Template" : "New Template"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground">Template name</label>
                  <Input value={name} onChange={e => setName(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Message body</label>
                  <Textarea
                    value={body}
                    onChange={e => setBody(e.target.value)}
                    rows={6}
                    placeholder="Hi {{clientName}}, ..."
                  />
                  <p className="text-xs text-muted-foreground mt-1.5">
                    Emoji and emoticons are supported.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={saveTemplate} disabled={!name.trim() || !body.trim()}>
                  Save
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
};

export default Templates;

