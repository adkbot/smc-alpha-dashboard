import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Lock, AlertCircle } from "lucide-react";

interface VisionAgentAuthProps {
  isOpen: boolean;
  onAuthenticated: () => void;
}

export const VisionAgentAuth = ({ isOpen, onAuthenticated }: VisionAgentAuthProps) => {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(false);

    // Verificar senha admin
    if (password === "28034050An") {
      sessionStorage.setItem("vision_admin_auth", "true");
      setPassword("");
      onAuthenticated();
    } else {
      setError(true);
    }
    
    setIsLoading(false);
  };

  return (
    <Dialog open={isOpen}>
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
                setError(false);
              }}
              className={error ? "border-destructive" : ""}
              autoFocus
            />
            {error && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                <span>Senha incorreta. Tente novamente.</span>
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
