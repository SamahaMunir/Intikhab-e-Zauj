import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function StaffConfig() {
  const { config } = useStore();

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-serif font-bold">Platform Settings</h1>
        <p className="text-muted-foreground">Adjust matching algorithms and system constraints.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Matching Algorithm Weights</CardTitle>
            <CardDescription>Adjust the importance of each factor (must sum to 100%)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between"><Label>Age</Label><span>{(config.weights.age * 100).toFixed(0)}%</span></div>
              <Slider defaultValue={[config.weights.age * 100]} max={100} step={5} />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between"><Label>Location</Label><span>{(config.weights.location * 100).toFixed(0)}%</span></div>
              <Slider defaultValue={[config.weights.location * 100]} max={100} step={5} />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between"><Label>Caste</Label><span>{(config.weights.caste * 100).toFixed(0)}%</span></div>
              <Slider defaultValue={[config.weights.caste * 100]} max={100} step={5} />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between"><Label>Education</Label><span>{(config.weights.education * 100).toFixed(0)}%</span></div>
              <Slider defaultValue={[config.weights.education * 100]} max={100} step={5} />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between"><Label>Income</Label><span>{(config.weights.income * 100).toFixed(0)}%</span></div>
              <Slider defaultValue={[config.weights.income * 100]} max={100} step={5} />
            </div>
            <Button className="w-full">Save Algorithm Settings</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Q&A Constraints</CardTitle>
            <CardDescription>Limits on the communication window.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between"><Label>Max Questions</Label><span>{config.qa.maxQuestions}</span></div>
              <Slider defaultValue={[config.qa.maxQuestions]} max={20} step={1} />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between"><Label>Communication Window (Days)</Label><span>{config.qa.commDays} days</span></div>
              <Slider defaultValue={[config.qa.commDays]} max={30} step={1} />
            </div>
            <Button className="w-full" variant="outline">Save Constraints</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
