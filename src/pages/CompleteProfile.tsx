import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

const CompleteProfile = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [name, setName] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setLoading(true);

        try {
            const { error } = await supabase
                .from("profiles")
                .insert({
                    id: user.id,
                    email: user.email!,
                    name: name,
                });

            if (error) throw error;

            // Also create default user_settings
            await supabase
                .from("user_settings")
                .insert({
                    user_id: user.id,
                    balance: 10000, // Default paper balance
                    paper_mode: true,
                });

            toast({
                title: "Perfil criado!",
                description: "Bem-vindo ao sistema.",
            });
            navigate("/dashboard");
        } catch (error: any) {
            toast({
                title: "Erro ao criar perfil",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>Complete seu Cadastro</CardTitle>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" value={user?.email} disabled />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="name">Nome Completo</Label>
                            <Input
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Seu nome"
                                required
                            />
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? "Salvando..." : "Concluir Cadastro"}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
};

export default CompleteProfile;
