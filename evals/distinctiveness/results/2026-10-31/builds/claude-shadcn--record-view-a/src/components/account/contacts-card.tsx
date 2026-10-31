import { StarIcon } from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { Contact } from "@/data/account"
import { formatDate, initials } from "@/lib/format"

export function ContactsCard({ contacts }: { contacts: Contact[] }) {
  return (
    <Card className="pb-0">
      <CardHeader>
        <CardTitle>Contacts</CardTitle>
        <CardDescription>
          {contacts.length} people at this account
        </CardDescription>
      </CardHeader>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-4">Name</TableHead>
            <TableHead>Buying role</TableHead>
            <TableHead>Email &amp; phone</TableHead>
            <TableHead className="pr-4 text-right">Last contacted</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contacts.map((c) => (
            <TableRow key={c.id}>
              <TableCell className="pl-4">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback className="text-xs">
                      {initials(c.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid">
                    <span className="flex items-center gap-1.5 font-medium">
                      {c.name}
                      {c.primary && (
                        <StarIcon
                          className="size-3.5 fill-amber-400 text-amber-400"
                          aria-label="Primary contact"
                        />
                      )}
                    </span>
                    <span className="text-muted-foreground">{c.title}</span>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline">{c.role}</Badge>
              </TableCell>
              <TableCell>
                <div className="grid">
                  <a
                    href={`mailto:${c.email}`}
                    className="underline-offset-4 hover:underline"
                  >
                    {c.email}
                  </a>
                  <a
                    href={`tel:${c.phone.replace(/[^\d+]/g, "")}`}
                    className="text-muted-foreground underline-offset-4 hover:underline"
                  >
                    {c.phone}
                  </a>
                </div>
              </TableCell>
              <TableCell className="pr-4 text-right text-muted-foreground">
                {formatDate(c.lastContacted)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  )
}
