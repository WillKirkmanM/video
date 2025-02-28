<script setup lang="ts">
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";

import {
  Clock,
  HistoryIcon,
  HomeIcon,
  Search,
  SettingsIcon,
  YoutubeIcon,
} from "lucide-vue-next";

import { ref, onMounted, computed } from "vue";
import { useRouter } from "vue-router";
import { SIDEBAR_COOKIE_NAME } from "@/components/ui/sidebar/utils";

interface NavItem {
  onClick?: () => unknown;
  title: string;
  url: string;
  icon: any;
  isActive?: boolean;
}

const data = {
  user: {
    name: "User",
    email: "user@example.com",
  },
  navMain: [
    {
      title: "Home",
      url: "/",
      icon: HomeIcon,
      isActive: true,
    },
    {
      title: "Subscriptions",
      url: "/subscriptions",
      icon: YoutubeIcon,
    },
  ] as NavItem[],

  userSections: [
    {
      name: "History",
      url: "/history",
      icon: HistoryIcon,
    },
    {
      name: "Settings",
      url: "/settings",
      icon: SettingsIcon,
    },
  ],
};

const activeTeam = ref({
  name: "ParsonLabs Video",
  plan: "",
  logo: "https://avatars.githubusercontent.com/u/138057124?s=200&v=4",
});

const router = useRouter();

const sidebarOpen = ref(false);

const goToHome = () => {
  router.push("/");
};

const goToPage = (url: string) => {
  router.push(url);
};

function toggleSidebar() {
  sidebarOpen.value = !sidebarOpen.value;

  const newCookieValue = (!sidebarOpen.value).toString();
  document.cookie = `${SIDEBAR_COOKIE_NAME}=${newCookieValue}; path=/; max-age=31536000`;
}

function getCookieValue(name: string) {
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? match[2] === "true" : false;
}

onMounted(() => {
  sidebarOpen.value = !getCookieValue(SIDEBAR_COOKIE_NAME);
});
</script>

<template>
  <SidebarProvider :open="!sidebarOpen">
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              @click="goToHome"
            >
              <div
                class="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground"
              >
                <nuxt-img
                  :src="activeTeam.logo"
                  class="size-8 rounded-sm cursor-pointer"
                  @click.stop="goToHome"
                  provider="ipx"
                  format="webp"
                  quality="90"
                  loading="eager"
                  alt="ParsonLabs Video logo"
                />
              </div>
              <div
                class="grid flex-1 text-left text-sm leading-tight cursor-pointer"
                @click.stop="goToHome"
              >
                <span class="truncate font-semibold">{{
                  activeTeam.name
                }}</span>
                <span class="truncate text-xs">{{ activeTeam.plan }}</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem v-for="item in data.navMain" :key="item.title">
              <SidebarMenuButton
                :tooltip="item.title"
                @click="goToPage(item.url)"
              >
                <component :is="item.icon" />
                <span>{{ item.title }}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup class="group-data-[collapsible=icon]:hidden">
          <SidebarGroupLabel>Account</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem v-for="item in data.userSections" :key="item.name">
              <SidebarMenuButton as-child>
                <NuxtLink :to="item.url" class="flex items-center gap-2 w-full">
                  <component :is="item.icon" />
                  <span>{{ item.name }}</span>
                </NuxtLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarRail />
    </Sidebar>

    <SidebarInset>
      <header
        class="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12"
      >
        <div class="flex items-center gap-2 px-4">
          <SidebarTrigger class="-ml-1" @click="toggleSidebar" />
          <Separator orientation="vertical" class="mr-2 h-4" />

          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem class="hidden md:block">
                <BreadcrumbLink href="/"> Home </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator class="hidden md:block" />
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        <SearchBar />
      </header>
      <slot />
    </SidebarInset>
  </SidebarProvider>
</template>
