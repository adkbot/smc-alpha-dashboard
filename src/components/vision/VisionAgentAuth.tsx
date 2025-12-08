import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Lock, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface VisionAgentAuthProps {
  isOpen: boolean;
  onAuthenticated: () => void;
  onClose?: () => void;
}

const SUPABASE_URL = "https://zfefnlibzgkfbgdtagho.supabase.co";

export const VisionAgentAuth = ({ isOpen, onAuthenticated, onClose }: VisionAgentAuthProps) => {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Validate password via Edge Function (server-side)
      const response = await fetch(`${SUPABASE_URL}/functions/v1/verify-vision-admin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'authenticate',
          password: password,
        }),
      });

      const data = await response.json();

      if (data.success && data.token) {
        // Store the secure token (not a boolean!)
        sessionStorage.setItem("vision_admin_token", data.token);
        setPassword("");
        onAuthenticated();
      } else {
        setError(data.error || "Senha incorreta. Tente novamente.");
      }
    } catch (err) {
      console.error("Auth error:", err);
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose?.()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-4">
            <Lock className="h-12 w-12 text-yellow-500" />
          </div>
          <DialogTitle className="text-center">Acesso Restrito ao Admin</DialogTitle>
          <DialogDescription className="text-center">
            Esta seção requer senha de administrador para acesso
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Input
              type="password"
              placeholder="Digite a senha admin"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(null);
              }}
              className={error ? "border-destructive" : ""}
              autoFocus
            />
            {error && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            )}
          </div>
          
          <Button type="submit" className="w-full" disabled={isLoading || !password}>
            {isLoading ? "Verificando..." : "Acessar Vision Agent"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// Helper function to verify token validity (can be used by other components)
export const verifyVisionAdminToken = async (): Promise<boolean> => {
  const token = sessionStorage.getItem("vision_admin_token");
  
  if (!token) {
    return false;
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/verify-vision-admin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'verify',
        token: token,
      }),
    });

    const data = await response.json();
    
    if (data.valid) {
      return true;
    } else {
      // Token invalid or expired, clear it
      sessionStorage.removeItem("vision_admin_token");
      return false;
    }
  } catch {
    return false;
  }
};

// Helper to clear the admin session
export const clearVisionAdminSession = () => {
  sessionStorage.removeItem("vision_admin_token");
};
