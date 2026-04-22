import { useState } from "react";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";

export function DemoSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const { currentUser, switchRole } = useStore();

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {isOpen ? (
        <div className="bg-white dark:bg-slate-900 border rounded-lg shadow-lg p-4 space-y-3 w-64">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-semibold text-sm">Demo: Switch Role</h3>
            <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-gray-700">✕</button>
          </div>
          <div className="space-y-2">
            <Button 
              variant={currentUser?.role === "applicant" ? "default" : "outline"} 
              className="w-full justify-start text-sm h-8"
              onClick={() => { switchRole("applicant"); window.location.href = "/app/dashboard"; }}
            >
              👩‍🦰 Applicant (Zainab)
            </Button>
            <Button 
              variant={currentUser?.role === "staff" ? "default" : "outline"} 
              className="w-full justify-start text-sm h-8"
              onClick={() => { switchRole("staff"); window.location.href = "/staff/dashboard"; }}
            >
              👩‍💻 Staff (Ayesha)
            </Button>
            <Button 
              variant={!currentUser ? "default" : "outline"} 
              className="w-full justify-start text-sm h-8"
              onClick={() => { switchRole("admin"); window.location.href = "/"; }}
            >
              🌐 Public (Logged out)
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Current: {currentUser ? `${currentUser.name} (${currentUser.role})` : "Logged out"}
          </p>
        </div>
      ) : (
        <Button 
          onClick={() => setIsOpen(true)}
          className="rounded-full shadow-lg bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          Demo Mode
        </Button>
      )}
    </div>
  );
}