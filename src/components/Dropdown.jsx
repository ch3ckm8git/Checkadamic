import { Fragment } from "react";
import { Listbox, Transition } from "@headlessui/react";
import { Check, ChevronDown } from "lucide-react";

export default function Dropdown({ label, options, selected, setSelected }) {
    return (
        <div className="w-full">
            <Listbox value={selected} onChange={setSelected}>
                <div className="relative mt-1">
                    <Listbox.Button className="relative w-full cursor-pointer rounded-lg border bg-white py-2 pl-3 pr-10 text-left shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                        <span className="block truncate">
                            {selected || `Select ${label}`}
                        </span>
                        <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                            <ChevronDown className="h-5 w-5 text-gray-400" />
                        </span>
                    </Listbox.Button>
                    <Transition
                        as={Fragment}
                        leave="transition ease-in duration-100"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                            {options.map((opt) => (
                                <Listbox.Option
                                    key={opt}
                                    value={opt}
                                    className={({ active }) =>
                                        `relative cursor-pointer select-none py-2 pl-10 pr-4 ${active ? "bg-indigo-100 text-indigo-900" : "text-gray-900"
                                        }`
                                    }
                                >
                                    {({ selected }) => (
                                        <>
                                            <span
                                                className={`block truncate ${selected ? "font-medium" : "font-normal"
                                                    }`}
                                            >
                                                {opt}
                                            </span>
                                            {selected && (
                                                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-indigo-600">
                                                    <Check className="h-5 w-5" />
                                                </span>
                                            )}
                                        </>
                                    )}
                                </Listbox.Option>
                            ))}
                        </Listbox.Options>
                    </Transition>
                </div>
            </Listbox>
        </div>
    );
}
