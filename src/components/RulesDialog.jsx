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
      <AlertDialogContent className="max-w-lg p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-xl sm:text-2xl font-bold text-center mb-2 sm:mb-4">
            How to Play
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3 sm:space-y-6">
            <div className="grid gap-2 sm:gap-4">
              <div className="flex items-start gap-2 sm:gap-3 bg-secondary/50 p-2 sm:p-3 rounded-lg">
                <Target className="w-4 h-4 sm:w-5 sm:h-5 mt-1 text-primary flex-shrink-0" />
                <div>
                  <h3 className="font-semibold mb-0.5 sm:mb-1 text-sm sm:text-base">Objective</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Guess the Country from the blurred flag image. You have 5 attempts to identify the country correctly.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2 sm:gap-3 bg-secondary/50 p-2 sm:p-3 rounded-lg">
                <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5 mt-1 text-primary flex-shrink-0" />
                <div>
                  <h3 className="font-semibold mb-0.5 sm:mb-1 text-sm sm:text-base">Hints</h3>
                  <div className="text-xs sm:text-sm text-muted-foreground">
                    With each guess, you'll receive additional hints:
                    <ul className="ml-2 sm:ml-3 mt-1 space-y-0.5">
                      <li className="flex items-center gap-1">
                        <span className="text-xs">•</span> Unblurred Flag
                      </li>
                      <li className="flex items-center gap-1">
                        <span className="text-xs">•</span> Population
                      </li>
                      <li className="flex items-center gap-1">
                        <span className="text-xs">•</span> Continent
                      </li>
                      <li className="flex items-center gap-1">
                        <span className="text-xs">•</span> Capital
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2 sm:gap-3 bg-secondary/50 p-2 sm:p-3 rounded-lg">
                <Clock3 className="w-4 h-4 sm:w-5 sm:h-5 mt-1 text-primary flex-shrink-0" />
                <div>
                  <h3 className="font-semibold mb-0.5 sm:mb-1 text-sm sm:text-base">Daily Challenge</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    A new flag is featured every day at midnight UTC. Come back daily for a new challenge!
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2 sm:gap-3 bg-secondary/50 p-2 sm:p-3 rounded-lg">
                <Brain className="w-4 h-4 sm:w-5 sm:h-5 mt-1 text-primary flex-shrink-0" />
                <div>
                  <h3 className="font-semibold mb-0.5 sm:mb-1 text-sm sm:text-base">Scoring</h3>
                  <div className="text-xs sm:text-sm text-muted-foreground">
                    <ul className="space-y-1">
                      <li className="flex items-center gap-2">
                        🟩 Correct guess
                      </li>
                      <li className="flex items-center gap-2">
                        🟥 Incorrect guess
                      </li>
                    </ul>
                    <p className="mt-2">Share your results with friends to compare scores!</p>
                  </div>
                </div>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-4 sm:mt-6">
          <AlertDialogAction className="w-full text-sm sm:text-base py-2 sm:py-3">
            Let's Play!
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default RulesDialog;