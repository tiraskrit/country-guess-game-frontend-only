import React from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { Brain, Target, Clock3, Image as ImageIcon } from 'lucide-react';

const RulesDialog = ({ open, onClose }) => {
  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-2xl font-bold text-center mb-4">
            How to Play
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-6">
            <div className="grid gap-4">
              <div className="flex items-start gap-3 bg-secondary/50 p-3 rounded-lg">
                <Target className="w-5 h-5 mt-1 text-primary" />
                <div>
                  <h3 className="font-semibold mb-1">Objective</h3>
                  <p className="text-sm text-muted-foreground">
                    Guess the Country from the blurred flag image. You have 5 attempts to identify the country correctly.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-secondary/50 p-3 rounded-lg">
                <ImageIcon className="w-5 h-5 mt-1 text-primary" />
                <div>
                  <h3 className="font-semibold mb-1">Hints</h3>
                  <div className="text-sm text-muted-foreground">
                    With each guess, you'll receive additional hints:
                    <ul>
                      <li>• Unblurred Flag </li>
                      <li>• Population </li>
                      <li>• Continent </li>
                      <li>• Capital </li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-secondary/50 p-3 rounded-lg">
                <Clock3 className="w-5 h-5 mt-1 text-primary" />
                <div>
                  <h3 className="font-semibold mb-1">Daily Challenge</h3>
                  <p className="text-sm text-muted-foreground">
                    A new flag is featured every day at midnight UTC. Come back daily for a new challenge!
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-secondary/50 p-3 rounded-lg">
                <Brain className="w-5 h-5 mt-1 text-primary" />
                <div>
                  <h3 className="font-semibold mb-1">Scoring</h3>
                  <div className="text-sm text-muted-foreground">
                    <ul>
                      <li>
                      🟩 Correct guess
                      </li>
                      <li>
                      🟥 Incorrect guess
                      </li>
                    </ul>
                    <br/>
                    Share your results with friends to compare scores!
                  </div>
                </div>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction className="w-full">Let's Play!</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default RulesDialog;