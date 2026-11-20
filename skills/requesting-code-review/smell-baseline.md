# Smell Baseline

A baseline for code-quality review from Fowler's _Refactoring_ chapter 3, applied even when a repository documents no standards of its own. Two rules govern how to apply it:

- **The repository overrides.** A documented repository standard always wins. When the repository endorses something this baseline would flag, suppress the smell.
- **Always a judgment call.** Treat each smell as a labelled heuristic, such as "possible Feature Envy", never a hard violation, and skip anything automated tooling already enforces.

Match these smells against the diff:

- **Mysterious Name.** A function, variable, or type whose name does not reveal what it does or holds. Rename it; if no honest name comes to mind, the design is murky.
- **Duplicated Code.** The same logic appears in more than one hunk or file in the change. Extract the shared logic and call it from both sites.
- **Feature Envy.** A method reaches into another object's data more than its own. Move the method onto the data it reaches into.
- **Data Clumps.** The same few fields or parameters keep travelling together. Bundle them into one type and pass that.
- **Primitive Obsession.** A primitive stands in for a domain concept that deserves its own type. Give the concept its own small type.
- **Repeated Switches.** The same `switch` or `if` cascade on the same type recurs across the change. Replace it with polymorphism or one shared map.
- **Shotgun Surgery.** One logical change forces scattered edits across many files in the diff. Gather the pieces that change together into one module.
- **Divergent Change.** One file or module is edited for several unrelated reasons. Split it so each module changes for one reason.
- **Speculative Generality.** Abstraction, parameters, or hooks exist for needs the spec does not have. Delete them and inline the code until a real need appears.
- **Message Chains.** Long `a.b().c().d()` navigation forces a caller to depend on intermediate structure. Hide the walk behind one method on the first object.
- **Middle Man.** A class or function mostly delegates onward. Remove it and call the real target directly.
- **Refused Bequest.** A subclass or implementer ignores most of what it inherits. Drop the inheritance and use composition.
